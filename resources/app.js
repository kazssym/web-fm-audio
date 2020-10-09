// app.js
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

// This file is a module script and shall be in strict mode by default.

/**
 * ES module for the application.
 *
 * @module app.js
 */


/**
 * Binds UI commands.
 */
function bindCommands()
{
}


let AudioContext = window.AudioContext;
if (AudioContext == null) {
    AudioContext = window.webkitAudioContext;
}

if ("audioWorklet" in AudioContext.prototype) {
    let audioContext = new AudioContext();
    audioContext.audioWorklet.addModule("./resources/worklet.js")
        .then(() => {
            bindCommands();
        });
}
else {
    alert("AudioWorklet support is missing.");
}
