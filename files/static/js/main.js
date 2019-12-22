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

(function () {
  const BUCKET_INPUT = document.getElementsByClassName('bucket-input')[0];
  const PREFIX_INPUT = document.getElementsByClassName('prefix-input')[0];
  const FETCH_BTN = document.getElementsByClassName('fetch-btn')[0];

  const PREV_BTN = document.getElementsByClassName('prev-btn')[0];
  const NEXT_BTN = document.getElementsByClassName('next-btn')[0];

  const MAXDIM_INPUT = document.getElementsByClassName('maxdim-input')[0];

  const IMAGE_DIV = document.getElementsByClassName('image-div')[0];
  const IMAGE_IMG = document.getElementsByClassName('image-img')[0];

  const LINKS_DIV = document.getElementsByClassName('links-div')[0];

  const DATA = {links: []};
  let current = 0;
  let id_token = '';

  function onSignIn(googleUser) {
    id_token = googleUser.getAuthResponse().id_token;
  }

  function showPrev() {
    if (DATA.links.length >= 0) {
      current = (current + 1) % DATA.links.length;
      refresh();
    }
  }

  function showNext() {
    if (DATA.links.length >= 0) {
      current = (current + DATA.links.length - 1) % DATA.links.length;
      refresh();
    }
  }

  function fitImage() {
    let max = MAXDIM_INPUT.value;
    if (max > 100) {
      if (IMAGE_IMG.naturalWidth > max || IMAGE_IMG.naturalHeight > max) {
        if (IMAGE_IMG.naturalWidth > IMAGE_IMG.naturalHeight) {
          IMAGE_IMG.removeAttribute('height');
          IMAGE_IMG.width = max;
        } else {
          IMAGE_IMG.removeAttribute('width');
          IMAGE_IMG.height = max;
        }
      }
    }
  }

  function refresh() {
    if (DATA.links.length >= 0) {
      IMAGE_IMG.src = DATA.links[current];
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
      div.innerHTML = '<div><a href="' + DATA.links[i] + '">' + DATA.links[i] + '</a></div>';
      LINKS_DIV.appendChild(div);
    }
  }

  function fetchImageLinks() {
    let b = BUCKET_INPUT.value;
    let p = PREFIX_INPUT.value;
    if (!!b && b.trim() !== '') {
      let url = '/buckets/' + b;
      if (!!p && p.trim() !== '') {
        url += '/prefixes/' + p;
      }

      doHttpGet(url, function (body) {
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
      }, console.log)
    }
  }

  refresh();

  FETCH_BTN.addEventListener('click', fetchImageLinks);

  PREV_BTN.addEventListener('click', showPrev);
  NEXT_BTN.addEventListener('click', showNext);

  MAXDIM_INPUT.addEventListener('input', fitImage);
  IMAGE_IMG.addEventListener('load', fitImage);
})();