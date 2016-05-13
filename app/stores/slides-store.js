import { observable, computed, transaction } from "mobx";
import Immutable from "seamless-immutable";
import { generate } from "shortid";

import elementMap from "../elements";

// TODO: REMOVE. Useful for testing
const allColors = [
  "#EF767A", "#456990", "#49BEAA", "#49DCB1", "#EEB868", "#EF767A", "#456990",
  "#49BEAA", "#49DCB1", "#EEB868", "#EF767A"
];

export default class SlidesStore {
  // Default slides state
  // history will be an array of slides arrays
  @observable history = Immutable.from([[{
    // Default first slide
    id: generate(),
    props: {},
    children: [],
    color: allColors[0]
  }, {
    id: generate(),
    props: {},
    children: [],
    color: allColors[1]
  }, {
    id: generate(),
    props: {},
    children: [],
    color: allColors[2]
  }, {
    id: generate(),
    props: {},
    children: [],
    color: allColors[3]
  }, {
    id: generate(),
    props: {},
    children: [],
    color: allColors[4]
  }]]);

  @observable historyIndex = 0;
  // TODO: Should these be part of history?
  // If we're undoing/redoing on a hidden slide, that is bad right?
  // NOTE: Keynote keeps both of these in history
  @observable currentSlideIndex = 0;
  @observable currentElementIndex = null;

  // Returns a new mutable object. Functions as a cloneDeep.
  @computed get slides() {
    return this.history[this.historyIndex].asMutable({ deep: true });
  }

  // Returns a new mutable object. Functions as a cloneDeep.
  @computed get currentSlide() {
    return this.slides[this.currentSlideIndex];
  }

  // Returns a new mutable object. Functions as a cloneDeep.
  @computed get currentElement() {
    return this.currentElementIndex && this.currentSlide[this.currentElementIndex];
  }

  @computed get undoDisabled() {
    return this.historyIndex === 0 || this.history.length <= 1;
  }

  @computed get redoDisabled() {
    return this.historyIndex >= this.history.length - 1;
  }

  constructor(slides) {
    if (slides) {
      this.history = Immutable.from([slides]);
    }
  }

  dropElement(elementType) {
    const slideToAddTo = this.currentSlide;
    const newSlidesArray = this.slides;

    slideToAddTo.children.push({
      ...elementMap[elementType],
      id: generate()
    });

    newSlidesArray[this.currentSlideIndex] = slideToAddTo;

    transaction(() => {
      this.currentElementIndex = this.currentElementIndex ?
        this.currentElementIndex + 1 :
        slideToAddTo.children.length - 1;
      this._addToHistory(newSlidesArray);
    });
  }

  setCurrentElementIndex(newIndex) {
    this.currentElementIndex = newIndex;
  }

  setSelectedSlideIndex(newSlideIndex) {
    transaction(() => {
      this.currentElementIndex = null;
      this.currentSlideIndex = newSlideIndex;
    });
  }

  moveSlide(currentIndex, newIndex) {
    const slidesArray = this.slides;

    slidesArray.splice(newIndex, 0, slidesArray.splice(currentIndex, 1)[0]);

    transaction(() => {
      this.currentElementIndex = null;
      this.currentSlideIndex = newIndex;
      this._addToHistory(slidesArray);
    });
  }

  addSlide() {
    const slidesArray = this.slides;

    // TODO: Figure out new slide defaults/interface
    const newSlide = {
      id: generate(),
      props: {},
      children: [],
      color: allColors[6]
    };

    slidesArray.splice(this.currentSlideIndex + 1, 0, newSlide);

    transaction(() => {
      this.currentElementIndex = null;
      this.currentSlideIndex = this.currentSlideIndex + 1;
      this._addToHistory(slidesArray);
    });
  }

  deleteSlide() {
    const slidesArray = this.slides;

    slidesArray.splice(this.currentSlideIndex, 1);

    transaction(() => {
      this.currentElementIndex = null;
      this.currentSlideIndex = this.currentSlideIndex - 1;
      this._addToHistory(slidesArray);
    });
  }

  undo() {
    // double check we're not trying to undo without history
    if (this.historyIndex === 0) {
      return;
    }

    this.historyIndex -= 1;
  }

  redo() {
    // Double check we've got a future to redo to
    if (this.historyIndex > this.history.length - 1) {
      return;
    }

    this.historyIndex += 1;
  }

  // TODO: Cap history length to some number to prevent absurd memory leaks
  _addToHistory(newSlides) {
    // Only notify observers once all expressions have completed
    transaction(() => {
      // If we have a future and we do an action, remove the future.
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      // Wrapp the new slides array in an array so they aren't concatted as individual slide objects
      this.history = this.history.concat([Immutable.from(newSlides)]);
      this.historyIndex += 1;
    });
  }
}