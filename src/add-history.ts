declare type HistoryMove = {
  Back: 0;
  Next: 1;
};
declare type HistoryMoveDir = HistoryMove[keyof HistoryMove];

class AddHistory {
  private readonly WRAPPER_ID = "add-history";
  private readonly FIXED_DIV_ID = "add-history-fixed";
  private readonly HISTORY_VIEW_CLASS = "add-history-view";
  private readonly FAVORITE_BUTTON_ID = "add-history-favorite";
  private readonly DISPLAY_MOUSEDOWN_TIME = 350;

  private _currentState = -1;
  private _states = -1;

  private _wrapper: HTMLDivElement;
  private _backButton: HTMLButtonElement;
  private _nextButton: HTMLButtonElement;
  private _backView: HTMLDivElement;
  private _nextView: HTMLDivElement;
  private _backViewOl: HTMLOListElement;
  private _nextViewOl: HTMLOListElement;
  private _fixedDiv: HTMLDivElement;

  private _favoriteButton: HTMLButtonElement;
  private _favoriteView: HTMLDivElement;
  private _favoriteViewOl: HTMLOListElement;

  private _currentElem: HTMLLIElement;

  static HistoryMove: HistoryMove = {
    Back: 0,
    Next: 1,
  } as const;

  constructor() {
    for (let i = 0; ; i++) {
      const href = sessionStorage.getItem(i.toString());

      // セッションが残っているなら最後に見た位置を復元する
      if (location.href === href) {
        // console.log("init", href);
        this._currentState = i;
      }

      if (!href) {
        if (i === 0) {
          if (location.hash) {
            sessionStorage.setItem("0", location.href);
          } else {
            // if first visited (User does not have a cookie).
            this._currentState = -1;
            this._states = -1;
          }

          break;
        } else {
          // ハッシュがセッションに存在しなければ現在位置を最後+1
          if (this._currentState === -1) {
            this._currentState = i;
          }

          this._states = i - 1;

          break;
        }
      }

      // console.log(sessionStorage.getItem(i.toString()));
    }

    /////////
    // init
    [this._wrapper, this._backButton, this._nextButton] = this._addButtons();
    [this._backView, this._backViewOl] = this._createHistoryView();
    [this._nextView, this._nextViewOl] = this._createHistoryView();
    this._wrapper.appendChild(this._backView);
    this._wrapper.appendChild(this._nextView);

    this._fixedDiv = this._addFixedDiv();

    // add lists backView
    for (let i = 0; i < this._currentState; i++) {
      const li = this._createList(i);
      this._backViewOl.insertAdjacentElement("afterbegin", li);
    }

    // add lists nextView
    for (let i = this._currentState + 1; i <= this._states; i++) {
      const li = this._createList(i);
      this._nextViewOl.appendChild(li);
    }

    // current seed list element
    // 初期化で値が無い場合は、空のリストをcurrentElemにする
    this._currentElem = this._createList(this._currentState);

    // add click listener
    this._addButtonClickBehavier();
    this._addSeedRandomClickListener();

    this._checkButtonState();

    // Init favoreite button
    this._favoriteButton = this._addFavoriteButton();
    [this._favoriteView, this._favoriteViewOl] = this._createHistoryView();
    this._wrapper.appendChild(this._favoriteView);

    this._initFavoriteItem(this._favoriteViewOl);
  }

  /**
   * Add history Buttons
   * @returns Tuple: wrapper div and backButton, nextButton inside it.
   */
  private _addButtons(): [
    HTMLDivElement,
    HTMLButtonElement,
    HTMLButtonElement
  ] {
    const wrapper = document.createElement("div");
    wrapper.id = this.WRAPPER_ID;

    const span = document.createElement("span");
    span.textContent = "History:";

    const backButton = document.createElement("button");
    backButton.className = "gh-button";
    backButton.textContent = "Back";

    const nextButton = document.createElement("button");
    nextButton.className = "gh-button";
    nextButton.textContent = "Next";

    wrapper.appendChild(span);
    wrapper.appendChild(backButton);
    wrapper.appendChild(nextButton);

    const fancyInputs = document.querySelector(".fancy-inputs-section");
    fancyInputs!.appendChild(wrapper);

    return [wrapper, backButton, nextButton];
  }

  /**
   * Create absolute position history view.
   * @returns Tuple: historyView div and ol inside it.
   */
  private _createHistoryView(): [HTMLDivElement, HTMLOListElement] {
    const historyView = document.createElement("div");
    historyView.className = this.HISTORY_VIEW_CLASS;

    const ol = document.createElement("ol");

    historyView.appendChild(ol);

    return [historyView, ol];
  }

  /**
   * Add fixed div for history views.
   * @returns Fixed position div.
   */
  private _addFixedDiv(): HTMLDivElement {
    const fixedDiv = document.createElement("div");
    fixedDiv.id = this.FIXED_DIV_ID;

    const releaseListener = () => {
      this._backView.style.display = "none";
      this._nextView.style.display = "none";
      fixedDiv.style.display = "none";
      this._favoriteView.style.display = "none";
    };

    fixedDiv.addEventListener("mousedown", releaseListener);
    fixedDiv.addEventListener("wheel", releaseListener);

    document.body.appendChild(fixedDiv);

    return fixedDiv;
  }

  /**
   * Check buttton state by currentState.
   */
  private _checkButtonState() {
    if (this._currentState <= 0) {
      this._backButton.disabled = true;
    } else {
      this._backButton.disabled = false;
    }

    if (this._currentState >= this._states) {
      this._nextButton.disabled = true;
    } else {
      this._nextButton.disabled = false;
    }
  }

  /**
   * Crate a seed list element.
   * @param state State of the list to be created.
   */
  private _createList(state: number): HTMLLIElement {
    const li = document.createElement("li");

    const value = sessionStorage.getItem(state.toString());
    if (value) {
      li.textContent = value.replace(/^.+#/, "");

      li.addEventListener("click", () => {
        // console.log(value, state, this._currentState);
        location.replace(value!);

        this._moveViewListsByState(state);
        this._currentState = state;

        this._checkButtonState();
        this._checkFavoritedSeed();

        this._backView.style.display = "none";
        this._nextView.style.display = "none";
        this._fixedDiv.style.display = "none";
      });
    }

    return li;
  }

  /**
   * Move list by state on View
   */
  private _moveViewListsByState(newState: number) {
    const diff = newState - this._currentState;

    if (diff < 0) {
      ////////////////////////////////
      // Move back view to next one.
      if (this._currentElem.textContent) {
        this._nextViewOl.insertAdjacentElement("afterbegin", this._currentElem);
      }

      for (let i = this._currentState - 1; i >= newState; i--) {
        const item = this._backViewOl.removeChild<HTMLLIElement>(
          this._backViewOl.firstChild as HTMLLIElement
        );

        if (i === newState) {
          this._currentElem = item;
        } else {
          this._nextViewOl.insertAdjacentElement("afterbegin", item);
        }
      }
    } else if (diff > 0) {
      ////////////////////////////////
      // Move next view to back one.
      if (this._currentElem.textContent) {
        this._backViewOl.insertAdjacentElement("afterbegin", this._currentElem);
      }

      for (let i = this._currentState + 1; i <= newState; i++) {
        const item = this._nextViewOl.removeChild<HTMLLIElement>(
          this._nextViewOl.firstChild as HTMLLIElement
        );

        if (i === newState) {
          this._currentElem = item;
        } else {
          this._backViewOl.insertAdjacentElement("afterbegin", item);
        }
      }
    }
  }

  /**
   * Move history view list by click buttons.
   * @param {HistoryMoveDir} moveDir History direction.
   */
  private _moveViewList(moveDir: HistoryMoveDir) {
    if (moveDir === AddHistory.HistoryMove.Back) {
      if (this._currentElem.textContent) {
        this._nextViewOl.insertAdjacentElement("afterbegin", this._currentElem);
      }

      this._currentElem = this._backViewOl.removeChild<HTMLLIElement>(
        this._backViewOl.firstChild as HTMLLIElement
      );
    } else if (moveDir === AddHistory.HistoryMove.Next) {
      if (this._currentElem.textContent) {
        this._backViewOl.insertAdjacentElement("afterbegin", this._currentElem);
      }

      this._currentElem = this._nextViewOl.removeChild<HTMLLIElement>(
        this._nextViewOl.firstChild as HTMLLIElement
      );
    }
  }

  /**
   * Add event listener to buttons.
   */
  private _addButtonClickBehavier() {
    let timeoutId: number;

    ////////////////
    // back button
    const backButtonClick = () => {
      clearTimeout(timeoutId);

      this._currentState--;
      const value = sessionStorage.getItem(this._currentState.toString());
      location.replace(value!);
      // console.log(currentState, states);

      this._checkButtonState();
      this._checkFavoritedSeed();
      this._moveViewList(AddHistory.HistoryMove.Back);
    };

    this._backButton.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      this._backButton.addEventListener("click", backButtonClick);

      timeoutId = window.setTimeout(() => {
        this._backButton.removeEventListener("click", backButtonClick);

        this._backView.style.top = `${
          (e.target! as HTMLElement).offsetTop + 25
        }px`;
        this._backView.style.left = `${
          (e.target! as HTMLElement).offsetLeft
        }px`;

        this._backView.style.display = "block";
        this._backView.scrollTop = 0;
        this._fixedDiv.style.display = "block";
      }, this.DISPLAY_MOUSEDOWN_TIME);
    });

    ////////////////
    // next button
    const nextButtonClick = () => {
      clearTimeout(timeoutId);

      this._currentState++;
      const value = sessionStorage.getItem(this._currentState.toString());
      location.replace(value!);
      // console.log(currentState, states);

      this._checkButtonState();
      this._checkFavoritedSeed();
      this._moveViewList(AddHistory.HistoryMove.Next);
    };

    this._nextButton.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      this._nextButton.addEventListener("click", nextButtonClick);

      timeoutId = window.setTimeout(() => {
        this._nextButton.removeEventListener("click", nextButtonClick);

        this._nextView.style.top = `${
          (e.target! as HTMLElement).offsetTop + 25
        }px`;
        this._nextView.style.left = `${
          (e.target! as HTMLElement).offsetLeft
        }px`;

        this._nextView.style.display = "block";
        this._nextView.scrollTop = 0;
        this._fixedDiv.style.display = "block";
      }, this.DISPLAY_MOUSEDOWN_TIME);
    });
  }

  /**
   * Add click listener to a random button
   */
  private _addSeedRandomClickListener() {
    const seed = document.getElementById("seed-random");

    seed!.addEventListener("click", () => {
      if (this._currentState < this._states) {
        for (let i = this._currentState + 1; i <= this._states; i++) {
          sessionStorage.removeItem(i.toString());
          this._nextViewOl.removeChild(this._nextViewOl.firstChild!);
        }
        this._states = this._currentState;
      }

      this._states++;
      this._currentState++;
      // console.log(this._currentState, this._states);

      sessionStorage.setItem(this._states.toString(), location.href);

      if (this._currentElem.textContent) {
        this._backViewOl.insertAdjacentElement("afterbegin", this._currentElem);
      }
      this._currentElem = this._createList(this._currentState);

      this._checkButtonState();
      this._checkFavoritedSeed();
    });
  }

  /////////////////////////////
  // Favorite button methods //
  /////////////////////////////
  /**
   * Add favorite button.
   */
  private _addFavoriteButton() {
    const favButton = document.createElement("button");
    favButton.className = "gh-button icon star";

    let timeoutId: number;
    const favClickEvent = () => {
      clearTimeout(timeoutId);

      if (favButton.getAttribute("checked") === null) {
        this._addFavoriteItem(this._favoriteViewOl);
        favButton.setAttribute("checked", "");
      } else {
        this._removeFavoriteItem(this._favoriteViewOl);
        favButton.removeAttribute("checked");
      }
    };

    favButton.addEventListener("mousedown", (e: MouseEvent) => {
      favButton.addEventListener("click", favClickEvent);

      timeoutId = setTimeout(() => {
        favButton.removeEventListener("click", favClickEvent);

        this._favoriteView.style.top = `${
          (e.target! as HTMLElement).offsetTop + 25
        }px`;
        this._favoriteView.style.left = `${
          (e.target! as HTMLElement).offsetLeft
        }px`;

        this._favoriteView.style.display = "block";
        this._favoriteView.scrollTop = 0;
        this._fixedDiv.style.display = "block";
      }, this.DISPLAY_MOUSEDOWN_TIME);
    });

    this._wrapper.appendChild(favButton);

    return favButton;
  }

  private _checkFavoritedSeed() {
    if (location.hash) {
      const seed = location.hash.replace(/^#/, "");

      for (let child of this._favoriteViewOl.children) {
        if (child.textContent === seed) {
          this._favoriteButton.setAttribute("checked", "");
          return;
        }
      }

      this._favoriteButton.removeAttribute("checked");
    }
  }

  private _addFavoriteItem(ol: HTMLOListElement) {
    if (location.hash) {
      const seed = location.hash.replace(/^#/, "");
      chrome.storage.sync.set({ [seed]: seed });

      const li = this._createFavList(seed);
      ol.insertAdjacentElement("afterbegin", li);
    }
  }

  private _removeFavoriteItem(ol: HTMLOListElement) {
    if (location.hash) {
      const seed = location.hash.replace(/^#/, "");
      chrome.storage.sync.remove(seed);

      for (let child of ol.children) {
        if (child.textContent === seed) {
          child.remove();
          break;
        }
      }
    }
  }

  private _createFavList(seed: string): HTMLLIElement {
    const li = document.createElement("li");

    if (seed) {
      li.textContent = seed;
      li.addEventListener("click", () => {
        console.log(location.hash, `#${li.textContent}`);
        if (location.hash !== `#${li.textContent}`) {
          if (this._currentState < this._states) {
            for (let i = this._currentState + 1; i <= this._states; i++) {
              sessionStorage.removeItem(i.toString());
              this._nextViewOl.removeChild(this._nextViewOl.firstChild!);
            }
            this._states = this._currentState;
          }

          this._states++;
          this._currentState++;
          // console.log(this._currentState, this._states);

          location.replace(location.pathname + "#" + seed);
          sessionStorage.setItem(this._states.toString(), location.href);

          if (this._currentElem.textContent) {
            this._backViewOl.insertAdjacentElement(
              "afterbegin",
              this._currentElem
            );
          }
          this._currentElem = this._createList(this._currentState);

          this._checkButtonState();
          this._favoriteButton.setAttribute("checked", "");

          this._favoriteView.style.display = "none";
          this._fixedDiv.style.display = "none";
        }
      });
    }

    return li;
  }

  private async _initFavoriteItem(ol: HTMLOListElement) {
    // chrome.storage.sync.clear();
    const keys = await chrome.storage.sync.get(null);

    for (let key in keys) {
      const li = this._createFavList(key);
      ol.insertAdjacentElement("afterbegin", li);
    }

    this._checkFavoritedSeed();
  }
}

new AddHistory();
console.log("Random Seed of History: Added.");
