namespace AddHistory {
  const HistoryMove = {
    Back: 0,
    Next: 1,
  } as const;

  declare type HistoryMoveDir = typeof HistoryMove[keyof typeof HistoryMove];

  declare type ContainerViews = {
    backView: BackContainer;
    nextView: NextContainer;
    bookmarkView: BookmarkContainer;
    fixedWrapper: FixedWrapper;
  };

  //==========================||
  // Namespace variable scope ||-----------------------------------------|
  //==========================||
  const _inputElement_ = document.getElementById("seed") as HTMLInputElement;

  let _currentState_ = -1;
  let _totalStates_ = -1;
  let _currentSeedItem_: CurrentSeedItem;

  //=========||
  // Classes ||----------------------------------------------------------|
  //=========||
  /**
   * Create a main container.
   * @param id A main element id.
   * @param label A first column text label.
   */
  class MainContainer {
    private _mainDiv: HTMLDivElement;
    private _span: HTMLSpanElement;

    constructor(id: string, label: string) {
      this._mainDiv = document.createElement("div");
      this._mainDiv.id = id;

      this._span = document.createElement("span");
      this._span.textContent = `${label}:`;
    }

    get element() {
      return this._mainDiv;
    }

    get label() {
      return this._span.textContent?.slice(0, -1);
    }

    set label(label: string | undefined) {
      this._span.textContent = `${label}:`;
    }

    /**
     * Append a element to main container.
     * @param element A element to be appended.
     */
    append(element: HTMLElement) {
      this._mainDiv.appendChild(element);
    }
  }

  /**
   * Base of button and view container.
   * @param viewClassName A class name for view.
   * @param buttonClassName A class name for button.
   */
  abstract class ButtonViewContainer {
    protected readonly DISPLAY_MOUSEDOWN_TIME = 350;

    protected _button: HTMLButtonElement;
    protected _view: HTMLDivElement;
    protected _oList: HTMLOListElement;
    protected _seedItemList: SeedItem[];

    constructor(viewClassName: string, buttonClassName?: string) {
      this._button = document.createElement("button");
      this._button.className = `gh-button ${
        buttonClassName ? buttonClassName : ""
      }`;

      this._view = document.createElement("div");
      this._view.className = viewClassName;

      this._oList = document.createElement("ol");
      this._view.appendChild(this._oList);

      this._seedItemList = [];
    }

    get buttonElement() {
      return this._button;
    }

    get buttonText() {
      return this._button.textContent;
    }

    get viewElement() {
      return this._view;
    }

    set buttonText(text: string | null) {
      this._button.textContent = text;
    }

    set viewDisplay(param: string) {
      this._view.style.display = param;
    }

    set viewTop(param: string) {
      this._view.style.top = param;
    }

    set viewLeft(param: string) {
      this._view.style.left = param;
    }

    /**
     * Get a seed value from the SeedItem list in this container.
     * @param n A index of the SeedItem list.
     * @returns A string seed value or undefined if index is out of array.
     */
    protected _getSeed(n: number) {
      return this._seedItemList[n].seed;
    }

    /**
     * Insert a SeedItem at the start of the view array.
     * @param seedItem A SeedItem.
     */
    insertItem(seedItem: SeedItem) {
      this._oList.insertAdjacentElement("afterbegin", seedItem.element);
      this._seedItemList.unshift(seedItem);
    }

    /**
     * Append a SeedItem to the end of the view array.
     * @param seedItem A SeedItem.
     */
    appendItem(seedItem: SeedItem) {
      this._oList.appendChild(seedItem.element);
      this._seedItemList.push(seedItem);
    }

    /**
     * Remove a SeedItem from the view array.
     * @param seedItem A SeedItem.
     * @returns A removed SeedItem. If there are no item to remove, return undefined.
     */
    removeItem(seedItem: SeedItem): SeedItem | undefined {
      const index = this._seedItemList.indexOf(seedItem);

      if (index >= 0) {
        this._oList.removeChild(seedItem.element);
        return this._seedItemList.splice(index, 1)[0];
      }

      return undefined;
    }

    /**
     * Remove a SeedItem from the start of the view array.
     * @returns A removed SeedItem. If there are no item to remove, return undefined.
     */
    removeFirstItem(): SeedItem | undefined {
      if (this._oList.children.length > 0) {
        this._oList.removeChild(this._oList.firstChild!);
        return this._seedItemList.shift();
      }

      return undefined;
    }

    /**
     * Remove all SeedItems.
     */
    removeAllItem() {
      for (let i = 0; i < this._seedItemList.length; i++) {
        this._oList.firstChild?.remove();
      }
      this._seedItemList = [];
    }

    /**
     * Move a SeedItem next to each other between back view, current space, and next view.
     * @param direction Move direction.
     * @param C Containers including a back and next container.
     */
    moveSeedItem(direction: HistoryMoveDir, C: ContainerViews) {
      if (_currentSeedItem_.seed) {
        if (direction === HistoryMove.Back) {
          C.nextView.insertItem(_currentSeedItem_);
          //
        } else if (direction === HistoryMove.Next) {
          C.backView.insertItem(_currentSeedItem_);
        }
      }

      _currentSeedItem_ =
        this.removeItem(this._seedItemList[0]) || new CurrentSeedItem();
    }
  }

  /**
   * Create a back button and view container.
   * @param viewClassName A class name for view.
   * @param buttonClassName A class name for button.
   */
  class BackContainer extends ButtonViewContainer {
    constructor(viewClassName: string, buttonClassName?: string) {
      super(viewClassName, buttonClassName);
      this.buttonText = "Back";
    }

    /**
     * Check the button state in this container.
     */
    checkButtonState() {
      if (_currentState_ <= 0) {
        this._button.disabled = true;
      } else {
        this._button.disabled = false;
      }
    }

    /**
     * Add a mouse event listener to the button in this container.
     * @param C Containers.
     */
    addButtonListener(C: ContainerViews): void {
      let timeoutId: number;

      const backButtonClick = () => {
        clearTimeout(timeoutId);

        _currentState_--;

        changeSeed(this._getSeed(0)!);

        this.checkButtonState();
        C.nextView.checkButtonState();
        C.bookmarkView.checkBookmarkedSeed();

        this.moveSeedItem(HistoryMove.Back, C);

        setLastState(_currentState_);
        // console.log(_currentState_, _currentSeedItem_);
      };

      this._button.addEventListener("mousedown", (e: MouseEvent) => {
        this._button.addEventListener("click", backButtonClick);

        timeoutId = window.setTimeout(() => {
          this._button.removeEventListener("click", backButtonClick);

          this.viewTop = `${(e.target! as HTMLElement).offsetTop + 25}px`;
          this.viewLeft = `${(e.target! as HTMLElement).offsetLeft}px`;

          this.viewDisplay = "block";
          this._view.scrollTop = 0;
          C.fixedWrapper.display = "block";
        }, this.DISPLAY_MOUSEDOWN_TIME);
      });
    }
  }

  /**
   * Create a next button and view container.
   * @param viewClassName A class name for view.
   * @param buttonClassName A class name for button.
   */
  class NextContainer extends ButtonViewContainer {
    constructor(viewClassName: string, buttonClassName?: string) {
      super(viewClassName, buttonClassName);
      this.buttonText = "Next";
    }

    /**
     * Check the button state in this container.
     */
    checkButtonState() {
      if (_currentState_ >= _totalStates_ || _totalStates_ <= 0) {
        this._button.disabled = true;
      } else {
        this._button.disabled = false;
      }
    }

    /**
     * Add a mouse event listener to the button in this container.
     * @param C Containers.
     */
    addButtonListener(C: ContainerViews) {
      let timeoutId: number;

      const nextButtonClick = () => {
        clearTimeout(timeoutId);

        _currentState_++;

        changeSeed(this._getSeed(0)!);

        this.checkButtonState();
        C.backView.checkButtonState();
        C.bookmarkView.checkBookmarkedSeed();

        this.moveSeedItem(HistoryMove.Next, C);

        setLastState(_currentState_);
        // console.log(_currentState_, _currentSeedItem_);
      };

      this._button.addEventListener("mousedown", (e: MouseEvent) => {
        this._button.addEventListener("click", nextButtonClick);

        timeoutId = window.setTimeout(() => {
          this._button.removeEventListener("click", nextButtonClick);

          this.viewTop = `${(e.target! as HTMLElement).offsetTop + 25}px`;
          this.viewLeft = `${(e.target! as HTMLElement).offsetLeft}px`;

          this.viewDisplay = "block";
          this._view.scrollTop = 0;
          C.fixedWrapper.display = "block";
        }, this.DISPLAY_MOUSEDOWN_TIME);
      });
    }
  }

  /**
   * Create a favorite button and view container.
   * @param viewClassName A class name for view.
   * @param buttonClassName A class name for button.
   */
  class BookmarkContainer extends ButtonViewContainer {
    private _checked: boolean;

    constructor(viewClassName: string, buttonClassName?: string) {
      super(viewClassName, buttonClassName);

      this._checked = false;
    }

    get checked() {
      return this._checked;
    }

    set checked(bool: boolean) {
      if (bool) {
        this._button.setAttribute("checked", "");
      } else {
        this._button.removeAttribute("checked");
      }

      this._checked = bool;
    }

    /**
     * Check to see if the displayed seed is a favorite.
     */
    checkBookmarkedSeed() {
      if (_inputElement_.value) {
        const currentSeed = _inputElement_.value;

        const filterItem = this._seedItemList.filter(
          (item) => item.seed === currentSeed
        );

        if (filterItem[0]) {
          this.checked = true;
        } else {
          this.checked = false;
        }
      }
    }

    /**
     * Add a seed to the favorite view.
     * @param seed A string seed value.
     * @param containerViews Containers.
     */
    addBookmarkItem(seed: string, containerViews: ContainerViews) {
      if (seed) {
        chrome.storage.sync.set({ [seed]: seed });

        const seedItem = new BookmarkSeedItem(seed, containerViews);
        this.insertItem(seedItem);
        this.checked = true;
      }
    }

    /**
     * Remove a seed from the favorite view.
     * @param seed A string seed value.
     */
    removeBookmarkItem(seed: string) {
      if (seed) {
        chrome.storage.sync.remove(seed);

        const removeItem = this._seedItemList.filter(
          (item) => item.seed === seed
        );

        if (removeItem[0]) {
          this.removeItem(removeItem[0]);
          this.checked = false;
        }
      }
    }

    /**
     * Add a mouse event listener to the button in this container.
     * @param containerViews Containers.
     */
    addButtonListener(containerViews: ContainerViews): void {
      let timeoutId: number;

      const bookmarkClick = () => {
        clearTimeout(timeoutId);

        const seed = _inputElement_.value;

        if (this.checked) {
          this.removeBookmarkItem(seed);
        } else {
          this.addBookmarkItem(seed, containerViews);
        }
      };

      this._button.addEventListener("mousedown", (e: MouseEvent) => {
        this._button.addEventListener("click", bookmarkClick);

        timeoutId = window.setTimeout(() => {
          this._button.removeEventListener("click", bookmarkClick);

          this.viewTop = `${(e.target! as HTMLElement).offsetTop + 25}px`;
          this.viewLeft = `${(e.target! as HTMLElement).offsetLeft}px`;

          this.viewDisplay = "block";
          this._view.scrollTop = 0;
          containerViews.fixedWrapper.display = "block";
        }, this.DISPLAY_MOUSEDOWN_TIME);
      });
    }

    /**
     * Get all bookmark items from storage and add them to this view.
     * @param containerViews
     */
    async getBookmarkFromStorage(containerViews: ContainerViews) {
      // chrome.storage.sync.clear();
      const keys = await chrome.storage.sync.get(null);

      for (let key in keys) {
        const seedItem = new BookmarkSeedItem(key, containerViews);
        this.appendItem(seedItem);
      }
    }
  }

  /**
   * Create a default SeedItem.
   * If constructor parameter is empty, an empty Item is created.
   * @param state Set state value.
   * @param setSeed Set seed value.
   * @param containerViews Containers for listener.
   */
  class SeedItem {
    protected _item: HTMLLIElement;
    protected _seed: string | undefined;
    protected _state: number;

    constructor(
      setSeed?: string,
      containerViews?: ContainerViews,
      state?: number
    ) {
      this._item = document.createElement("li");

      if (state !== undefined && state >= 0) {
        this._state = state;
      } else {
        this._state = -1;
      }

      if (setSeed && containerViews) {
        this._seed = setSeed;
        this._item.textContent = this._seed;

        this.addClickListener(containerViews);
      } else if (setSeed || containerViews) {
        throw Error("Both seed and containerViews are required");
      }
    }

    get element() {
      return this._item;
    }

    get seed() {
      return this._seed;
    }

    get state() {
      return this._state;
    }

    set state(newState: number) {
      this._state = newState;
    }

    /**
     * Add this SeedItem to click listener.
     * @param C Containers.
     */
    protected addClickListener(C: ContainerViews) {
      this._item.addEventListener("click", () => {
        changeSeed(this.seed!);

        this.moveSeedItemsByState(C.backView, C.nextView);
        _currentState_ = this.state;

        C.backView.checkButtonState();
        C.nextView.checkButtonState();
        C.bookmarkView.checkBookmarkedSeed();

        C.backView.viewDisplay = "none";
        C.nextView.viewDisplay = "none";
        C.fixedWrapper.display = "none";

        setLastState(_currentState_);
      });
    }

    /**
     * Move SeedItems in succession.
     * This SeedItem moves from the clicked position to the current space.
     * @param backView A back container.
     * @param nextView A next container.
     */
    moveSeedItemsByState(backView: BackContainer, nextView: NextContainer) {
      const diff = this.state - _currentState_;

      if (diff < 0) {
        ////////////////////////////////
        // Move back view to next one.
        if (_currentSeedItem_.seed) {
          nextView.insertItem(_currentSeedItem_);
        }

        for (let i = _currentState_ - 1; i >= this.state; i--) {
          const item = backView.removeFirstItem();

          if (item) {
            if (i === this.state) {
              _currentSeedItem_ = item;
            } else {
              nextView.insertItem(item);
            }
          } else {
            _currentSeedItem_ = new CurrentSeedItem();
          }
        }
      } else if (diff > 0) {
        ////////////////////////////////
        // Move next view to back one.
        if (_currentSeedItem_.seed) {
          backView.insertItem(_currentSeedItem_);
        }

        for (let i = _currentState_ + 1; i <= this.state; i++) {
          const item = nextView.removeFirstItem();

          if (item) {
            if (i === this.state) {
              _currentSeedItem_ = item;
            } else {
              backView.insertItem(item);
            }
          } else {
            _currentSeedItem_ = new CurrentSeedItem();
          }
        }
      }
    }
  }

  /**
   * Create a favorite SeedItem.
   * @param seed Set seed value.
   * @param containerViews ContainerViews for Listener.
   */
  class BookmarkSeedItem extends SeedItem {
    constructor(seed: string, containerViews: ContainerViews) {
      super(seed, containerViews);
      // 継承先から呼び出したsuperコンストラクタに
      // オーバーライドされるメソッドがある場合、継承先のメソッドが呼びだされる
    }

    /**
     * Add this SeedItem to click listener.
     * @param C Containers.
     */
    protected addClickListener(C: ContainerViews) {
      this._item.addEventListener("click", () => {
        if (_inputElement_.value !== this.seed) {
          // 先の履歴の削除
          if (_currentState_ < _totalStates_) {
            for (let i = _currentState_ + 1; i <= _totalStates_; i++) {
              chrome.storage.local.remove(i.toString());
              C.nextView.removeFirstItem();
            }
            _totalStates_ = _currentState_;
          }

          if (_currentSeedItem_.seed) {
            _currentState_++;
            C.backView.insertItem(_currentSeedItem_);
          }
          _totalStates_++;

          changeSeed(this.seed!);

          _currentSeedItem_ = new CurrentSeedItem(this.seed, C, _currentState_);

          chrome.storage.local.set({ [_totalStates_]: this.seed });

          C.backView.checkButtonState();
          C.nextView.checkButtonState();
          C.bookmarkView.checked = true;

          C.bookmarkView.viewDisplay = "none";
          C.fixedWrapper.display = "none";

          setLastState(_currentState_);
        }
        // console.log(_currentState_, _totalStates_);
      });
    }
  }

  /**
   * Create a current SeedItem.
   * If constructor parameter is empty, an empty Item is created.
   * @param setSeed Set seed value.
   * @param state Set state value.
   */
  class CurrentSeedItem extends SeedItem {
    get element() {
      return this._item;
    }

    set element(element: HTMLLIElement) {
      this._item = element;
    }
  }

  /**
   * Fixed wrapper for closing container views.
   * @param id A string div element of id.
   */
  class FixedWrapper {
    private _fixedDiv: HTMLDivElement;

    constructor(id: string) {
      this._fixedDiv = document.createElement("div");
      this._fixedDiv.id = id;
    }

    get element() {
      return this._fixedDiv;
    }

    set display(param: string) {
      this._fixedDiv.style.display = param;
    }

    /**
     * Add a listener to this element.
     * @param displayNoneViews Containers you want to close.
     */
    addListener(
      displayNoneViews: ButtonViewContainer[],
      deleteView: DeleteHistoryContainer
    ) {
      const noneDisplays = () => {
        for (let view of displayNoneViews) {
          view.viewDisplay = "none";
        }

        this.display = "none";
        deleteView.viewDisplay = "none";
      };

      this._fixedDiv.addEventListener("mousedown", noneDisplays);
      this._fixedDiv.addEventListener("wheel", noneDisplays);
    }
  }

  /**
   * Create a delete history button and view container.
   * @param buttonClassName A classname for this button.
   * @param viewClassName A classname for this view.
   */
  class DeleteHistoryContainer {
    private _button: HTMLButtonElement;
    private _view: HTMLDivElement;
    private _okButton: HTMLButtonElement;

    constructor(buttonClassName: string, viewClassName: string) {
      this._button = document.createElement("button");
      this._view = document.createElement("div");

      const buttonImg = document.createElement("img");
      buttonImg.src = chrome.runtime.getURL("./images/delete_forever_24.png");
      buttonImg.draggable = false;
      this._button.appendChild(buttonImg);

      this._button.className = `gh-button ${buttonClassName}`;
      this._view.className = viewClassName;

      const span = document.createElement("span");
      span.textContent = "Delete history?";

      this._okButton = document.createElement("button");
      this._okButton.className = "gh-button add-history-delete-okbutton";
      this._okButton.textContent = "OK";

      this._view.appendChild(span);
      this._view.appendChild(this._okButton);
    }

    get buttonElement() {
      return this._button;
    }

    get viewElement() {
      return this._view;
    }

    set viewTop(param: string) {
      this._view.style.top = param;
    }

    set viewLeft(param: string) {
      this._view.style.left = param;
    }

    set viewDisplay(param: string) {
      this._view.style.display = param;
    }

    /**
     * Add a click listener to the button in this container.
     * @param C Containers.
     */
    addButtonListener(C: ContainerViews) {
      this._button.addEventListener("click", (e: MouseEvent) => {
        this.viewTop = `${(e.target! as HTMLElement).offsetTop + 30}px`;
        this.viewLeft = `25px`;

        this.viewDisplay = "block";
        C.fixedWrapper.display = "block";
      });

      this._okButton.addEventListener("click", () => {
        chrome.storage.local.clear();

        _currentState_ = 0;
        _totalStates_ = -1;

        _currentSeedItem_ = new CurrentSeedItem();

        C.backView.removeAllItem();
        C.nextView.removeAllItem();

        C.backView.checkButtonState();
        C.nextView.checkButtonState();

        this.viewDisplay = "none";
        C.fixedWrapper.display = "none";
      });
    }
  }

  //===========||
  // Functions ||--------------------------------------------------------|
  //===========||
  /**
   * Create a hash code from string.
   * @param s A string.
   * @returns A created hash code.
   */
  function createHashCode(s: string) {
    let hashCode = 0;

    for (let i = 0; i < s.length; i++) {
      hashCode = hashCode * 31 + s[i].charCodeAt(0);
    }

    return hashCode;
  }

  /**
   * Change seed input area value.
   * When this input area focus is removed,
   * URL hash is automatically changed
   * by Biome Finder specifications.
   * @param seed A seed value.
   */
  function changeSeed(seed: string) {
    _inputElement_.value = seed;
    _inputElement_.focus();
    _inputElement_.blur();
  }

  /**
   * Set last viewing state.
   * @param state A state number.
   */
  function setLastState(state: number) {
    chrome.storage.local.set({ lastState: state });
  }

  /**
   * Get all history items from storage and add them to back and next view.
   * @param C Containers for init and listener.
   */
  async function getHistoryFromStorage(C: ContainerViews) {
    const storageSeeds = await chrome.storage.local.get(null);
    const currentSeed = _inputElement_.value;

    let lastState = storageSeeds.lastState as number;
    let duplicate = [];

    // 現在ハッシュでのシードの重複を探す
    for (let key in storageSeeds) {
      if (currentSeed === storageSeeds[key]) {
        duplicate.push(key);
      }
    }

    // 重複があれば、最後に見たシード位置かどうか調べる
    if (duplicate.length > 1) {
      if (!duplicate.includes(lastState.toString())) {
        // 当てはまらなければ、通常通りにする
        lastState = -1;
      }
    }

    for (let i = 0; ; i++) {
      // セッションが残っているなら最後に見た位置を復元する
      if (currentSeed === storageSeeds[i] && lastState === i) {
        _currentState_ = i;
        // console.log("init", storageSeeds[i]);
      }

      if (!storageSeeds[i]) {
        // undefined
        if (i === 0) {
          // Storage is empty
          _currentState_ = 0;
          _totalStates_ = -1;

          break;
        } else {
          // ハッシュがセッションに存在しなければ現在位置を最後+1
          if (_currentState_ === -1) {
            _currentState_ = i;
          }

          _totalStates_ = i - 1;

          break;
        }
      } else {
        if (i < _currentState_ || _currentState_ === -1) {
          C.backView.insertItem(new SeedItem(storageSeeds[i], C, i));
        } else if (i > _currentState_) {
          C.nextView.appendItem(new SeedItem(storageSeeds[i], C, i));
        } else if (i === _currentState_) {
          _currentSeedItem_ = new CurrentSeedItem(storageSeeds[i], C, i);
        }
      }
    }
    // console.log(_currentState_, _totalStates_);
  }

  /**
   * Add a click listener to a random button in Biome Finder.
   * @param C ContainerViews.
   */
  function addSeedRandomClickListener(C: ContainerViews) {
    const ramdomButton = document.getElementById("seed-random");

    ramdomButton!.addEventListener("click", () => {
      // 先の履歴の削除
      if (_currentState_ < _totalStates_) {
        for (let i = _currentState_ + 1; i <= _totalStates_; i++) {
          chrome.storage.local.remove(i.toString());
          C.nextView.removeFirstItem();
        }
        _totalStates_ = _currentState_;
      }

      if (_currentSeedItem_.seed) {
        _currentState_++;
        C.backView.insertItem(_currentSeedItem_);
      }
      _totalStates_++;

      const seed = _inputElement_.value;

      _currentSeedItem_ = new CurrentSeedItem(seed, C, _currentState_);

      chrome.storage.local.set({ [_totalStates_]: seed });

      C.backView.checkButtonState();
      C.nextView.checkButtonState();
      C.bookmarkView.checkBookmarkedSeed();

      setLastState(_currentState_);
    });
  }

  //===============||
  // Main function ||----------------------------------------------------|
  //===============||
  /**
   * Init and run Add-History.
   */
  export async function main() {
    // Create instances
    const mainContainer = new MainContainer("add-history", "History");
    const backContainer = new BackContainer("add-history-view");
    const nextContainer = new NextContainer("add-history-view");
    const bookmarkContainer = new BookmarkContainer(
      "add-history-view",
      "icon star"
    );
    const deleteHistoryContainer = new DeleteHistoryContainer(
      "add-history-delete-button",
      "add-history-delete-view"
    );
    const fixedWrapper = new FixedWrapper("add-history-fixed");

    // Append elements to HTML
    const fancyInputs = document.querySelector(".fancy-inputs-section");
    fancyInputs!.appendChild(mainContainer.element);

    mainContainer.append(backContainer.buttonElement);
    mainContainer.append(nextContainer.buttonElement);
    mainContainer.append(bookmarkContainer.buttonElement);
    mainContainer.append(deleteHistoryContainer.buttonElement);

    mainContainer.append(backContainer.viewElement);
    mainContainer.append(nextContainer.viewElement);
    mainContainer.append(bookmarkContainer.viewElement);
    mainContainer.append(deleteHistoryContainer.viewElement);

    document.body.appendChild(fixedWrapper.element);

    // Container view for referencing variables in event listeners.
    const containerViews: ContainerViews = {
      backView: backContainer,
      nextView: nextContainer,
      bookmarkView: bookmarkContainer,
      fixedWrapper: fixedWrapper,
    };

    // Init a empty current seed item
    _currentSeedItem_ = new CurrentSeedItem();

    // Parse data from storage.
    await getHistoryFromStorage(containerViews);
    await bookmarkContainer.getBookmarkFromStorage(containerViews);

    // Add click listeners
    backContainer.addButtonListener(containerViews);
    nextContainer.addButtonListener(containerViews);
    bookmarkContainer.addButtonListener(containerViews);
    deleteHistoryContainer.addButtonListener(containerViews);
    fixedWrapper.addListener(
      [backContainer, nextContainer, bookmarkContainer],
      deleteHistoryContainer
    );

    addSeedRandomClickListener(containerViews);

    // Init check button state
    backContainer.checkButtonState();
    nextContainer.checkButtonState();
    bookmarkContainer.checkBookmarkedSeed();

    // Add change listener to input element.
    _inputElement_.addEventListener("change", () => {
      bookmarkContainer.checkBookmarkedSeed();
    });
  }
}

//==============||
// Global scope ||-------------------------------------------------------|
//==============||
AddHistory.main();
console.log("Random Seed of History: Added.");
