import '/app.css';
import {
  Storage,
  DisplayObject,
  SoundManager,
  Toggle as ToggleBase,
  Tempo,
  setDocumentHeight,
  makeSelect,
  makeArray,
  makeInput,
  makeButton,
  makeNode,
  makeSlider,
  getXAsPercentOfY,
  floorTo,
  ceilTo,
  limit,
  minWidth,
  append,
  appendTo,
} from '@jamesrock/rockjs';
import { presets } from './presets';

setDocumentHeight();

const toMixer = (keys, saved) => {
  const out = {};
  saved.forEach((item, index) => {
    out[keys[index]] = item;
  });
  return out;
};

const limitChars = (name, max = 12) => {
  return name.length > max ? `${name.split('').splice(0, max).join('').trim()}...` : name;
};

const addInputListeners = (nodes, listener) => {

  nodes.forEach((node) => {
    node.addEventListener('input', () => {
      listener(node.getValue());
    });
  });

  return nodes;

};

class Toggle extends ToggleBase {
  constructor(items, name = '{name}', initialValue, className, title = '{title}') {

    super(items, name, initialValue, className);

    this.title = title;
    this.setProp('title', title);

  };
};

class ToggleFallback extends DisplayObject {
  constructor(items, value) {

    super();

    this.node = makeSelect(items, value);

  };
  getValue() {

    return Number(this.node.value);

  };
};

class Slider extends DisplayObject {
  constructor(label = '{label}', value, min, max, step = 1, transform = (a) => a, direction = 'vertical') {

    super();

    this.node = makeNode('div', 'slider');
    this.display = makeNode('div', 'slider-display');
    this.slider = makeSlider(value, min, max, step);
    this.label = label;
    this.transform = transform;
    this.direction = direction;

    this.setProp('direction', this.direction);

    append(this.node)(this.slider)(this.display);

    this.node.addEventListener('input', () => {
      this.inputHandler();
    });

    this.inputHandler();

  };
  getValue() {

    return Number(this.slider.value);

  };
  setValue(value) {

    this.slider.value = value;
    this.dispatchEvent('input');
    return this;

  };
  inputHandler() {

    this.display.innerHTML = `<div class="slider-display-label">${this.label}</div><div class="slider-display-value">${this.transform(this.slider.value)}</div>`;

  };
};

class Interaction extends DisplayObject {
  constructor() {

    super();

  };
  hide() {

    this.setProp('hidden', true);
    return this;

  };
  addListeners() {

    this.acceptButton.addEventListener('click', () => {
      this.dispatchEvent('accept');
      this.hide();
    });

    this.rejectButton.addEventListener('click', () => {
      this.dispatchEvent('reject');
      this.hide();
    });

    return this;

  };
};

class Prompt extends Interaction {
  constructor(body = '{body}') {

    super();

    this.node = makeNode('div', 'prompt-overlay');
    this.promptNode = makeNode('div', 'prompt');
    this.headNode = makeNode('div', 'prompt-head');
    this.bodyNode = makeNode('div', 'prompt-body');
    this.footNode = makeNode('div', 'confirm-foot');
    this.acceptButton = makeButton('ok', 'yes');
    this.rejectButton = makeButton('cancel', 'no');
    this.input = makeInput('', 'text');

    this.headNode.innerText = body;

    append(this.promptNode)(this.headNode)(this.bodyNode)(this.footNode);
    append(this.footNode)(this.acceptButton)(this.rejectButton);
    append(this.bodyNode)(this.input);
    append(this.node)(this.promptNode);

    this.addListeners();

  };
  getValue() {

    return this.input.value;

  };
};

class Confirm extends Interaction {
  constructor(body = '{body}') {

    super();

    this.node = makeNode('div', 'confirm-overlay');
    this.confirmNode = makeNode('div', 'confirm');
    this.headNode = makeNode('div', 'confirm-head');
    this.footNode = makeNode('div', 'confirm-foot');
    this.acceptButton = makeButton('yes', 'yes');
    this.rejectButton = makeButton('no', 'no');

    this.headNode.innerText = body;

    append(this.footNode)(this.acceptButton)(this.rejectButton);
    append(this.confirmNode)(this.headNode)(this.footNode);
    append(this.node)(this.confirmNode);

    this.addListeners();

  };
};

class InteractionFactory {
  constructor(target) {

    this.target = target;

  };
  prompt(body) {

    const p = new Prompt(body);
    appendTo(this.target)(p);
    return p;

  };
  confirm(body) {

    const c = new Confirm(body);
    appendTo(this.target)(c);
    return c;

  };
};

class Sequencer extends DisplayObject {
  constructor() {

    super();

    this.node = makeNode('div', 'step-sequencer');
    this.sounds = new SoundManager({
      'kick': '/audio/kick.mp3',
      'snare': '/audio/snare.mp3',
      'hats-cl': '/audio/hats-cl.mp3',
      'hats-op': '/audio/hats-op.mp3',
      'crash': '/audio/crash.mp3',
      'sidestick': '/audio/sidestick.mp3',
      'tom-lo': '/audio/tom-lo.mp3',
      'tom-hi': '/audio/tom-hi.mp3',
      'ride': '/audio/ride.mp3',
      'clap': '/audio/clap.mp3',
      'conga-lo': '/audio/conga-lo.mp3',
      'conga-hi': '/audio/conga-hi.mp3',
      'tambo': '/audio/tambo.mp3',
      'cabasa': '/audio/cabasa.mp3',
      'cowbell': '/audio/cowbell.mp3',
      'clave': '/audio/clave.mp3',
    });
    this.labels = [
      'kick',
      'snare',
      'hats cl',
      'hats op',
      'crash',
      'sidestick',
      'tom lo',
      'tom hi',
      'ride',
      'clap',
      'conga lo',
      'conga hi',
      'tambo',
      'cabasa',
      'cowbell',
      'clave',
    ];
    this.keys = this.sounds.keys;
    this.instruments = this.makeInstruments();
    this.steps = new Steps(this);
    this.storage = new Storage('me.jamesrock.seq');

    this.startButton = makeButton('start');
    this.saveButton = makeButton('store');
    this.tapButton = makeButton('tap', 'tap');
    this.instButton = makeButton('inst: kick', 'inst');
    this.patternClearButton = makeButton('clear\nptrn', 'clear');
    this.instrumentClearButton = makeButton('clear\ninst', 'clear');
    this.partPrevButton = makeButton('<', 'dir');
    this.partAddButton = makeButton('+16', 'add');
    this.partNextButton = makeButton('>', 'dir');

    const sliderDirection = tiny ? 'horizontal' : 'vertical';

    this.bpmSelect = new Slider('BPM', 120, 60, 180, 2, (a) => a, sliderDirection);
    this.panningSelect = new Slider('PAN', 0, -1, 1, 0.1, (value) => getXAsPercentOfY(value, 1), sliderDirection);
    this.volumeSelect = new Slider('LEVEL', 0.5, 0, 1, 0.1, (value) => floorTo(getXAsPercentOfY(value, 1)), sliderDirection);

    this.controllersNode = makeNode('div', 'controllers');
    this.controllersTopNode = makeNode('div', 'controllers-top');
    this.controllersBottomNode = makeNode('div', 'controllers-bottom');
    this.controllersBottomLeftNode = makeNode('div', 'controllers-bottom-left');
    this.controllersBottomRightNode = makeNode('div', 'controllers-bottom-right');
    this.fallbacksNode = makeNode('div', 'fallbacks');
    this.buttonsNode = makeNode('div', 'buttons');
    this.buttonsTopNode = makeNode('div', 'buttons-top');
    this.buttonsBottomNode = makeNode('div', 'buttons-bottom');
    this.slidersNode = makeNode('div', 'sliders');
    this.patternsNode = makeNode('div', 'patterns-target');
    this.patternsFallbackNode = makeNode('div', 'patterns-fallback-target');

    appendTo(this.slidersNode)(this.volumeSelect)(this.panningSelect)(this.bpmSelect);
    append(this.controllersTopNode)(this.patternsNode)(this.slidersNode);
    append(this.controllersBottomLeftNode)(this.tapButton)(this.instButton);
    append(this.controllersBottomLeftNode)(this.fallbacksNode);
    append(this.controllersBottomNode)(this.controllersBottomLeftNode)(this.controllersBottomRightNode);
    append(this.buttonsTopNode)(this.partPrevButton)(this.partAddButton)(this.partNextButton);
    append(this.buttonsBottomNode)(this.patternClearButton)(this.saveButton)(this.instrumentClearButton)(this.startButton);
    append(this.buttonsNode)(this.buttonsTopNode)(this.buttonsBottomNode);
    append(this.controllersBottomRightNode)(this.buttonsNode);
    append(this.controllersNode)(this.controllersTopNode)(this.controllersBottomNode);
    append(this.node)(this.controllersNode);
    appendTo(this.node)(this.steps);

    if(tiny) {
      appendTo(this.fallbacksNode)(this.bpmSelect)(this.panningSelect)(this.volumeSelect);
      append(this.fallbacksNode)(this.patternsFallbackNode);
    };

    addInputListeners([this.bpmSelect], (value) => {
      this.bpm = value;
    });

    addInputListeners([this.panningSelect], (value) => {
      this.sounds.pan(this.instrument.id, value);
    });

    addInputListeners([this.volumeSelect], (value) => {
      this.sounds.volume(this.instrument.id, value);
    });

    [this.patternsNode, this.patternsFallbackNode].forEach((node) => {
      node.addEventListener('input', () => {
        this.patternChangeHandler();
      });
    });

    this.startButton.addEventListener('click', () => {

      if(this.playing) {
        this.stop();
        this.toggleButtons();
        this.flashPart(1.5);
      }
      else {
        this.start();
      };

    });

    this.saveButton.addEventListener('click', () => {
      this.save();
    });

    this.instButton.addEventListener('click', () => {
      this.toggleSelectMode();
    });

    this.tapButton.addEventListener('click', () => {
      this.bpmSelect.setValue(tempo.tap());
    });

    this.patternClearButton.addEventListener('click', () => {
      interaction.confirm('clear pattern?').on('accept', () => {
        this.instruments = this.makeInstruments();
        this.reset();
      });
    });

    this.instrumentClearButton.addEventListener('click', () => {
      interaction.confirm('clear instrument?').on('accept', () => {
        this.instrument.clear();
        this.applyInstrument();
      });
    });

    this.partPrevButton.addEventListener('click', () => {
      this.part --;
      this.steps.setPart(this.part);
      this.toggleButtons();
      this.flashPart();
    });

    this.partAddButton.addEventListener('click', () => {

      this.instruments.forEach((inst) => {
        inst.addPart();
      });

      this.applyInstrument();

      this.parts = this.instrument.steps.length/16;
      this.part = this.parts - 1;
      this.steps.setPart(this.part);
      this.toggleButtons();
      this.flashLength();

    });

    this.partNextButton.addEventListener('click', () => {
      this.part ++;
      this.steps.setPart(this.part);
      this.toggleButtons();
      this.flashPart();
    });

    this.disableSelectMode();
    this.toggleButtons();

    if(!this.storage.get('patterns')) {
      this.applyPresets();
    };

    this.sounds.load().then(() => {
      this.renderPatternSelect();
    });

  };
  applyPresets() {

    this.presets.forEach((item) => {

      const existing = this.storage.get('patterns') || [];
      const saved = [...existing, item];
      this.storage.set('patterns', saved);

    });

    this.storage.set('pattern', this.presets.length - 1);

    return this;

  };
  start() {

    this.playing = true;

    if(this.queued && this.currentStep === 0) {
      this.queued = false;
      this.setProp('queued', this.queued);
      this.stop();
      this.patternChangeHandler();
      this.start();
      return;
    };

    this.steps.flash(this.currentStep);

    this.play(this.currentStep);

    if(this.currentStep % 16 === 0) {
      const part = ceilTo((this.currentStep+1)/16);
      this.steps.setPart(part-1);
      this.part = part-1;
      this.partAddButton.innerText = part;
      this.toggleButtons();
    };

    if(this.currentStep === (this.instrument.steps.length - 1)) {
      this.currentStep = 0;
    }
    else {
      this.currentStep ++;
    };

    this.timer = setTimeout(() => {
      this.start();
    }, this.modes[this.mode]/this.bpm);

    return this;

  };
  stop() {

    this.playing = false;
    this.currentStep = 0;
    this.steps.clear();

    clearTimeout(this.timer);

    return this;

  };
  play(beat) {

    this.instruments.forEach((inst) => {
      if(inst.steps[beat]) {
        this.sounds.play(inst.id);
      };
    });

    return this;

  };
  enable(beat) {

    this.instrument.steps[beat] = 1;
    return this;

  };
  disable(beat) {

    this.instrument.steps[beat] = 0;
    return this;

  };
  save() {

    const existing = this.storage.get('patterns');
    const patternId = this.patternSelect.getValueAsNumber();
    const pattern = existing[patternId];
    const overwrite = interaction.confirm(`overwrite '${pattern[0]}'?`);

    overwrite.on('accept', () => {

      existing[patternId] = this.getPatternData(pattern[0]);
      this.storage.set('patterns', existing);
      this.storage.set('pattern', patternId);

      this.patternSelect.updateItemLabel(patternId, `${limitChars(existing[patternId][0])} ${existing[patternId][1]}`);

    });

    overwrite.on('reject', () => {

      const name = interaction.prompt('new pattern name?');

      name.on('accept', () => {

        const saved = [...existing, this.getPatternData(name.getValue())];
        this.storage.set('patterns', saved);
        this.storage.set('pattern', saved.length - 1);

        this.renderPatternSelect();

      });

    });

    return this;

  };
  renderPatternSelect() {

    if(this.patternSelect) {
      this.patternSelect.destroy();
    };

    const saved = this.storage.get('patterns');
    const items = saved.map(([name, bpm], index) => [`${limitChars(name)} ${bpm}`, index]);
    const defaultValue = this.storage.get('pattern');

    if(tiny) {
      this.patternSelect = new ToggleFallback(items, defaultValue);
      this.patternSelect.appendTo(this.patternsFallbackNode);
    }
    else {
      this.patternSelect = new Toggle(items, 'pattern', defaultValue, 'patterns', 'Pattern');
      this.patternSelect.appendTo(this.patternsNode);
      this.patternSelect.scrollIntoView();
    };

    this.patternChangeHandler();

    return this;

  };
  patternChangeHandler() {

    if(this.playing && !this.queued) {
      this.queued = true;
      this.setProp('queued', this.queued);
      return;
    };

    const saved = this.storage.get('patterns');
    const patternId = this.patternSelect.getValueAsNumber();
    const pattern = saved[patternId];
    this.bpmSelect.setValue(pattern[1]);
    this.instruments = pattern[2].map((steps, index) => new Instrument(this, this.keys[index], this.labels[index], steps));
    this.sounds.mixer = toMixer(this.keys, pattern[3]);
    this.storage.set('pattern', patternId);
    this.reset();

  };
  applyInstrument() {

    this.steps.applyInstrument();

    const channel = this.sounds.mixer[this.instrument.id];

    this.volumeSelect.setValue(channel[0]);
    this.panningSelect.setValue(channel[1]);

    return this;

  };
  getPatternData(name) {

    return [name, this.bpmSelect.getValue(), this.instruments.map((inst) => inst.steps), this.instruments.map((inst) => this.sounds.mixer[inst.id])]

  };
  toggleButtons() {

    if(this.playing) {
      this.partPrevButton.disabled = true;
      this.partAddButton.disabled = true;
      this.partNextButton.disabled = true;
      this.startButton.innerText = 'stop';
      return;
    }
    else {
      this.startButton.innerText = 'start';
    };

    this.partPrevButton.disabled = false;
    this.partAddButton.disabled = false;
    this.partNextButton.disabled = false;

    if(this.parts===1) {
      // can't move either way
      this.partPrevButton.disabled = true;
      this.partNextButton.disabled = true;
      return;
    };

    if(this.parts===4) {
      // can't add new part
      this.partAddButton.disabled = true;
    };

    if(this.part===this.parts-1) {
      // can't move next
      this.partNextButton.disabled = true;
    };

    if(this.part===0) {
      // can't move left
      this.partPrevButton.disabled = true;
    };

    return this;

  };
  flashPart(duration = 1) {

    this.partAddButton.disabled = true;
    this.partAddButton.innerText = (this.part + 1);

    clearTimeout(this.flashTimeout);

    this.flashTimeout = setTimeout(() => {
      this.resetPartAddButton();
    }, duration*1000);

    return this;

  };
  flashLength(duration = 1) {

    this.partAddButton.disabled = true;
    this.partAddButton.innerText = this.instrument.steps.length;

    clearTimeout(this.flashTimeout);

    this.flashTimeout = setTimeout(() => {
      this.resetPartAddButton();
    }, duration*1000);

    return this;

  };
  resetPartAddButton() {

    this.partAddButton.innerText = '+16';
    this.toggleButtons();
    return this;

  };
  makeInstruments() {

    return this.keys.map((id, index) => new Instrument(this, id, this.labels[index]));

  };
  reset() {

    const current = this.instrument ? this.keys.indexOf(this.instrument.id) : 0;
    this.instrument = this.instruments[current];
    this.parts = this.instrument.steps.length/16;
    this.part = 0;
    this.steps.setPart(0);
    this.applyInstrument();
    this.toggleButtons();
    return this;

  };
  enableSelectMode() {

    this.selectMode = true;
    this.setProp('selectMode', this.selectMode);
    this.steps.enableCurrentInstrument();
    return this;

  };
  disableSelectMode() {

    this.selectMode = false;
    this.setProp('selectMode', this.selectMode);
    return this;

  };
  toggleSelectMode() {

    if(this.selectMode) {
      this.disableSelectMode();
    }
    else {
      this.enableSelectMode();
    };

    return this;

  };
  setInstrument(inst) {

    setTimeout(() => {
      this.instrument = this.instruments[inst];
      this.instButton.innerText = `inst: ${this.instrument.name}`;
      this.disableSelectMode();
      this.applyInstrument();
    }, 1000);

    return this;

  };
  playing = false;
  currentStep = 0;
  bpm = 120;
  queued = false;
  modes = {
    '1/16': 15000,
    '1/8': 30000,
    '1/4': 60000
  };
  mode = '1/16';
  presets = presets;
  part = 0;
  parts = 1;
  flashTimeout = 0;
  selectMode = false;
};

class Instrument {
  constructor(seq, id, name, steps = makeArray(16, () => 0)) {

    this.seq = seq;
    this.id = id;
    this.name = name;
    this.steps = steps;

  };
  clear() {

    this.steps = makeArray(this.steps.length, () => 0);
    return this;

  };
  addPart() {

    const start = (this.seq.part)*16;
    const end = start+16;

    const copy = this.steps.slice(start, end);
    this.steps = this.steps.concat(copy);

  };
};

class Steps extends DisplayObject {
  constructor(seq, count = 64) {

    super();

    this.seq = seq;
    this.node = makeNode('div', 'steps');
    this.count = count;
    this.steps = this.make();

    this.addListeners();
    this.render();

  };
  make() {

    let part = 0;
    let inst = 0;
    let color = 0;

    return makeArray(this.count).map((index) => {
      const step = new Step(this.seq, index, part, inst, this.stepColors[color]);
      inst ++;
      if((index + 1) % 4 === 0) {
        color ++;
      };
      if((index + 1) % 16 === 0) {
        part ++;
        inst = 0;
        color = 0;
      };
      return step;
    });

  };
  render() {

    this.steps.forEach((step) => {
      step.appendTo(this.node);
    });

    return this;

  };
  clear() {

    this.steps.forEach((step) => {
      step.unflash();
    });

    return this;

  };
  disable() {

    this.steps.forEach((step) => {
      step.disable(true);
    });

    return this;

  };
  flash(index) {

    this.clear();
    this.steps[index].flash();
    return this;

  };
  applyInstrument() {

    this.steps.forEach((step, index) => {
      if(this.seq.instrument.steps[index]) {
        step.enable(true);
      }
      else {
        step.disable(true);
      };
    });

    return this;

  };
  setPart(part) {

    this.steps.forEach((step) => {
      if(step.part===part) {
        step.show();
      }
      else {
        step.hide();
      };
    });

    return this;

  };
  addListeners() {

    let beats = [];

    this.node.addEventListener('click', (e) => {
      if(e.target?.classList.contains('step')) {
        if(this.seq.selectMode) {
          const step = this.steps[e.target.dataset.beat];
          this.disable();
          step.enable(true);
          this.seq.setInstrument(step.instrument);
        }
        else {
          this.steps[e.target.dataset.beat].toggle();
        };
  		};
    });

    this.node.addEventListener('touchstart', () => {
      if(this.seq.selectMode) {return};
      beats = [];
    });

    this.node.addEventListener('touchmove', (e) => {

      if(this.seq.selectMode) {return};

      const node = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);

     	if(node?.classList.contains('step')) {
        const beat = node.dataset.beat;
    		if(beats.indexOf(beat)===-1) {
     			beats.push(beat);
          this.steps[beat].toggle();
    		};
     	};
     	e.preventDefault();

    });

    return this;

  };
  enableCurrentInstrument() {

    this.steps.forEach((step) => {
      if(this.seq.playing) {return};
      if(step.instrumentId === this.seq.instrument.id) {
        step.enable(true);
      }
      else {
        step.disable(true);
      };
    });
    return this;

  };
  stepColors = ['red', 'orange', 'yellow', 'white'];
};

class Step extends DisplayObject {
  constructor(seq, beat, part, instrument, color = 'red') {

    super();

    this.node = makeNode('div', `step.${color}`);
    this.indicator = makeNode('div', 'step-indicator');
    this.seq = seq;
    this.beat = beat;
    this.part = part;
    this.instrument = instrument;
    this.instrumentId = this.seq.keys[instrument];
    this.label = this.seq.labels[instrument];
    this.color = color;
    this.visible = this.part===this.seq.part;

    append(this.node)(this.indicator);

    this.setProp('enabled', this.enabled);
    this.setProp('active', this.active);
    this.setProp('visible', this.visible);
    this.setProp('beat', this.beat);
    this.setProp('label', this.label);

  };
  flash() {

    this.active = true;
    this.setProp('active', this.active);
    return this;

  };
  unflash() {

    this.active = false;
    this.setProp('active', this.active);
    return this;

  };
  enable(soft = false) {

    this.enabled = true;
    this.setProp('enabled', this.enabled);
    if(!soft) {
      this.seq.enable(this.beat);
    };
    return this;

  };
  disable(soft = false) {

    this.enabled = false;
    this.setProp('enabled', this.enabled);
    if(!soft) {
      this.seq.disable(this.beat);
    };
    return this;

  };
  toggle() {

    if(this.enabled) {
      this.disable();
    }
    else {
      this.enable();
    };
    return this;

  };
  show() {

    this.visible = true;
    this.setProp('visible', this.visible);
    return this;

  };
  hide() {

    this.visible = false;
    this.setProp('visible', this.visible);
    return this;

  };
  enabled = false;
  active = false;
  visible = false;
};

const interaction = new InteractionFactory(document.body);
const tempo = new Tempo();
const tiny = !minWidth(376);
const gutter = tiny ? 15 : 25;
const gap = 6;
const padSize = (((limit(window.innerWidth, 500) - (gutter*2)) - (gap*3)) / 4);
document.documentElement.style.setProperty('--gap', `${gap}px`);
document.documentElement.style.setProperty('--pad-size', `${padSize}px`);
document.documentElement.style.setProperty('--sliders-size', `${(padSize*2) + gap}px`);
document.documentElement.style.setProperty('--gutter', `${gutter}px`);

const sequencer = new Sequencer();

console.log(sequencer);

sequencer.appendTo(document.body);
