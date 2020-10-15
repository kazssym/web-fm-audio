// fm-synthesizer.js
// Copyright (C) 2020 Kaz Nishimura
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
// for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* global sampleRate */

/**
 * Module script for the audio worklet processors.
 * This file must be imported by an
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet AudioWorklet}
 * object.
 *
 * @module fm-synthesizer.js
 */

// This file is a module script and shall be in strict mode by default.

const A3_KEY = 69;

class FMOperator
{
    /**
     *
     * @param {number} index an index for arrays
     * @param {Object} voice voice parameters shared among operators
     */
    constructor(index, voice)
    {
        this._index = index;
        this._voice = voice;
        this._totalLevel = 1.0;
        this._multiple = 1.0;

        this._output = 0;
        this._phase = 0;
        this._started = false;
        // TODO: make a real envelope generator.
        this._envelope = 0;
    }

    /**
     * Index of this operator given to the constructor.
     */
    get index()
    {
        return this._index;
    }

    /**
     * Amplitude of this operator.
     */
    get totalLevel()
    {
        return this._totalLevel;
    }

    set totalLevel(totalLevel)
    {
        this._totalLevel = totalLevel;
    }

    /**
     * Frequency multiple of this operator.
     */
    get multiple()
    {
        return this._multiple;
    }

    set multiple(multiple)
    {
        this._multiple = multiple;
    }

    /**
     * Output of this operator.
     */
    get output()
    {
        return this._output;
    }

    advance(modulation)
    {
        if (modulation == null) {
            modulation = 0;
        }

        let amplitude = this._totalLevel;
        amplitude *= this._envelope;

        this._output = amplitude * Math.sin(2 * Math.PI * (this._phase + 4 * modulation));
        this._phase += this._multiple * this._voice.phaseIncrement;
        this._phase -= Math.floor(this._phase);
    }

    start()
    {
        this._started = true;
        this._envelope = 1.0;
    }

    stop()
    {
        this._started = false;
        this._envelope = 0;
    }
}

class FMSynthesizer extends AudioWorkletProcessor
{
    constructor(options)
    {
        super(options);
        this._voice = {
            key: A3_KEY,
            phaseIncrement: 440 / sampleRate,
        };
        this._operators = [0, 1, 2, 3]
            .map((index) => new FMOperator(index, this._voice));

        this._connection = [
            [0, 0, 0, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 1, 0],
        ];
        this._mix = [0, 0, 0, 1];

        // Gets note-ons/offs as messages.
        this.port.addEventListener("message", (event) => {
            console.debug("data = %o", event.data);
            this.handleMessage(event.data);
        });
        this.port.start();
    }

    handleMessage(message)
    {
        if ("noteOn" in message) {
            if ("key" in message.noteOn) {
                this._voice.key = message.noteOn.key;
                this._voice.phaseIncrement = 440 / sampleRate
                    * Math.pow(2, (message.noteOn.key - A3_KEY) / 12);
            }
            this._operators
                .forEach((o) => {
                    o.start();
                });
        }
        if ("noteOff" in message) {
            if (this._voice.key == message.noteOff.key) {
                this._operators
                    .forEach((o) => {
                        o.stop();
                    });
            }
        }
    }

    /**
     * Processes audio samples.
     *
     * @param {Float32Array[][]} _inputs input buffers
     * @param {Float32Array[][]} outputs output buffers
     * @return {boolean}
     */
    process(_inputs, outputs)
    {
        if (outputs.length >= 1) {
            for (let k = 0; k < outputs[0][0].length; ++k) {
                for (let i = 0; i < 4; i++) {
                    let modulation = this._operators
                        .reduce((x, o) => x + this._connection[i][o.index] * o.output,
                            0);
                    this._operators[i].advance(modulation);
                }

                let output = 0.125 * this._operators
                    .reduce((x, o) => x + this._mix[o.index] * o.output,
                        0);
                for (let i = 0; i < outputs.length; i++) {
                    for (let j = 0; j < outputs[i].length; j++) {
                        outputs[i][j][k] = output;
                    }
                }
            }
        }
        return true;
    }
}

registerProcessor("fm-synthesizer", FMSynthesizer);
