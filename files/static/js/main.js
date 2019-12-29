'use strict';
/*
 * Copyright 2019 Hayo van Loon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

let idToken = '';

function onSignIn(googleUser) {
  idToken = googleUser.getAuthResponse().id_token;
}

function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
    idToken = '';
    console.log('User signed out.');
  });
}


(function () {
  const PREFIX_INPUT = document.getElementsByClassName('prefix-input')[0];
  const FETCH_BTN = document.getElementsByClassName('fetch-btn')[0];

  const PREV_BTN = document.getElementsByClassName('prev-btn')[0];
  const NEXT_BTN = document.getElementsByClassName('next-btn')[0];
  const ROT_BTN = document.getElementsByClassName('rot-btn')[0];

  const MAXW_INPUT = document.getElementsByClassName('maxw-input')[0];
  const MAXH_INPUT = document.getElementsByClassName('maxh-input')[0];

  const IMAGE_DIV = document.getElementsByClassName('image-div')[0];
  const IMAGE_IMG = document.getElementsByClassName('image-img')[0];

  const LINKS_DIV = document.getElementsByClassName('links-div')[0];

  const DATA = {api: "", links: []};
  let current = 0;
  let rotation = 0;

  function showPrev() {
    if (DATA.links.length > 0) {
      current = (current + DATA.links.length - 1) % DATA.links.length;
      rotation = 0;
      refresh();
    }
  }

  function showNext() {
    if (DATA.links.length > 0) {
      current = (current + 1) % DATA.links.length;
      rotation = 0;
      refresh();
    }
  }

  function rotate() {
    rotation = rotation + 270 % 360;
    refresh();
  }

  function fitImage() {
    let scaleW = (MAXW_INPUT.value ? MAXW_INPUT.value : IMAGE_IMG.naturalWidth) / IMAGE_IMG.naturalWidth;
    let scaleH = (MAXH_INPUT.value ? MAXH_INPUT.value : IMAGE_IMG.naturalHeight) / IMAGE_IMG.naturalHeight;

    if (scaleW < 1 || scaleH < 1) {
      if (scaleW < scaleH) {
        IMAGE_IMG.removeAttribute('height');
        IMAGE_IMG.width = IMAGE_IMG.naturalWidth * scaleW;
      } else {
        IMAGE_IMG.removeAttribute('width');
        IMAGE_IMG.height = IMAGE_IMG.naturalHeight * scaleH;
      }
    }
  }

  function refresh() {
    if (!!DATA.links && DATA.links.length > 0) {
      IMAGE_IMG.src = DATA.links[current];
      if (rotation > 0) {
        IMAGE_IMG.style = 'transform: rotate(' + rotation + 'deg);';
      } else {
        IMAGE_IMG.removeAttribute('style');
      }
      IMAGE_DIV.hidden = false;
      LINKS_DIV.hidden = false;
    } else {
      IMAGE_DIV.hidden = true;
      LINKS_DIV.hidden = true;
    }

    printLinks();
  }

  function printLinks() {
    LINKS_DIV.innerText = "";
    for (let i = 0; i < DATA.links.length; i += 1) {
      let div = document.createElement('div');
      div.innerHTML = '<div><button class="jmp-to-btn">' + DATA.links[i] + '</button></div>';
      div.getElementsByClassName('jmp-to-btn')[0].addEventListener('click', function () {
        current = i;
        refresh();
      });
      LINKS_DIV.appendChild(div);
    }
  }

  function fetchImageLinks() {
    let p = PREFIX_INPUT.value;
    let url = '/v1/prefixes/';
    if (!!p && p.trim() !== '') {
      url += p;
    }

    doHttpGetAuth(url, idToken, function (body) {
      let o = JSON.parse(body);
      if (!!o.imageLinks) {
        DATA.links = [];
        for (let i = 0; i < o.imageLinks.length; i += 1) {
          DATA.links.push(o.imageLinks[i]);
          current = 0;
        }
        DATA.links.sort();
        refresh();
      }
    }, function (httpReq) {
      if (httpReq.status === 401 || httpReq.status === 403) {
        PREFIX_INPUT.value = httpReq.responseText;
      }
      console.log();
    })
  }

  refresh();

  FETCH_BTN.addEventListener('click', fetchImageLinks);

  PREV_BTN.addEventListener('click', showPrev);
  NEXT_BTN.addEventListener('click', showNext);
  ROT_BTN.addEventListener('click', rotate);

  MAXW_INPUT.addEventListener('input', fitImage);
  MAXH_INPUT.addEventListener('input', fitImage);
  IMAGE_IMG.addEventListener('load', fitImage);

  document.getElementsByClassName('hide-btn')[0].addEventListener('click', function () {
    document.getElementsByClassName('controls-div')[0].hidden = true;
  });
  document.getElementsByClassName('show-btn')[0].addEventListener('click', function () {
    document.getElementsByClassName('controls-div')[0].hidden = false;
  });
})();
