import '/app.css';
import {
  Storage,
  SoundManager,
  DisplayObject,
  makeArray,
  makeInput,
  makeButton,
  makeNode,
  makeToggle,
  makeSelect
} from '@jamesrock/rockjs';

const makeSlider = (value, min, max, step = 1) => {
  const node = makeInput(0, 'range');
  node.min = min;
  node.max = max;
  node.step = step;
  node.value = value;
  return node;
};

class Toggle extends DisplayObject {
  constructor(items, name = '{name}', value) {

    super();

    this.node = makeNode('form');
    this.name = name;

    this.node.appendChild(makeToggle(items, name, value));

  };
  getValue() {

    const data = new FormData(this.node);

    return data.get(this.name);

  };
  addEventListener(event, handler) {

    this.node.addEventListener(event, handler);

  };
};

class Sequencer extends DisplayObject {
  constructor() {

    super();

    this.node = makeNode('div', 'step-sequencer');

    this.steps = new Steps(this);
    // this.channels = this.setupChannelStrips();
    this.sounds = new SoundManager({
      'kick': '/audio/kick.mp3',
      'snare': '/audio/snare.mp3',
      'hats-closed': '/audio/hats-closed.mp3',
      'hats-open': '/audio/hats-open.mp3',
      'clap': '/audio/clap.mp3',
      'clave': '/audio/clave.mp3',
      // 'crash': '',
      // 'ride': '',
    });
    this.storage = new Storage('me.jamesrock.seq');
    this.keys = Object.keys(this.sounds.sounds);
    this.instruments = this.keys.map(() => makeArray(16, () => 0));
    this.instrumentSelect = new Toggle(this.keys.map((inst, index) => [inst, index]), 'instrument', 0);
    this.saved = this.storage.get('patterns') || [];

    this.startButton = makeButton('start');
    this.saveButton = makeButton('save');
    this.bpmSelect = makeSlider(120, 60, 200);
    this.bpmDisplay = makeNode('div', 'bpm-display');
    this.buttonsNode = makeNode('div', 'buttons');

    this.node.appendChild(this.bpmSelect);
    this.node.appendChild(this.bpmDisplay);
    this.instrumentSelect.appendTo(this.node);
    this.buttonsNode.appendChild(this.startButton);
    this.buttonsNode.appendChild(this.saveButton);
    this.node.appendChild(this.buttonsNode);
    this.steps.appendTo(this.node);

    this.startButton.addEventListener('click', () => {

      if(this.playing) {
        this.stop();
        this.startButton.innerText = 'start';
      }
      else {
        this.start();
        this.startButton.innerText = 'stop';
      };

    });

    this.saveButton.addEventListener('click', () => {
      this.save();
    });

    this.bpmSelect.addEventListener('input', this.bpmChangeHandler.bind(this));
    this.bpmChangeHandler();

    this.instrumentSelect.addEventListener('input', this.applyPattern.bind(this));

    this.sounds.load();

    if(!this.saved.length) {
      this.save('empty');
    }
    else {
      this.renderPatternSelect();
    };

  };
  applyPattern() {

    this.steps.steps.forEach((step, index) => {
      if(this.instruments[this.instrumentSelect.getValue()][index]) {
        step.enable();
      }
      else {
        step.disable();
      };
    });

    return this;

  };
  start() {

    this.playing = true;

    this.steps.clear();
    this.steps.steps[this.currentStep].flash();

    this.play(this.currentStep);

    if(this.currentStep===(this.steps.count - 1)) {
      this.currentStep = 0;
    }
    else {
      this.currentStep ++;
    };

    this.timer = setTimeout(() => {
      this.start();
    }, this.modes[this.mode]/this.bpmSelect.value);

    return this;

  };
  play(beat) {

    this.instruments.forEach((inst, index) => {
      if(inst[beat]) {
        this.sounds.play(this.keys[index]);
      };
    });

    return this;

  };
  stop() {

    this.playing = false;
    this.currentStep = 0;
    this.steps.clear();

    clearTimeout(this.timer);
    return this;

  };
  enable(beat) {

    this.instruments[this.instrumentSelect.getValue()][beat] = 1;

  };
  disable(beat) {

    this.instruments[this.instrumentSelect.getValue()][beat] = 0;

  };
  setupChannelStrips() {

    const Kick = new Instrument('BassDrum');
    const Snare = new Instrument('SnareDrum');
    const RimShot = new Instrument('RimShot');
    const Clap = new Instrument('handClaP');
    const LowConga = new Instrument('LowConga');
    const LowTom = new Instrument('LowTom');
    const MidConga = new Instrument('MidConga');
    const MidTom = new Instrument('MidTom');
    const HiConga = new Instrument('HiConga');
    const HiTom = new Instrument('HiTom');
    const Accent = new Instrument('ACcent');
    const Clave = new Instrument('CLave');
    const Maracas = new Instrument('MAracas');
    const CowBell = new Instrument('CowBell');
    const Cymbal = new Instrument('CYmbal');
    const OpenHats = new Instrument('OpenHats');
    const ClosedHats = new Instrument('ClosedHats');

    return [
      new Channel([Accent], [new LevelKnob()]),
      new Channel([Kick], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([Snare], [new LevelKnob(), new ToneKnob(), new SnappyKnob()]),
      new Channel([LowConga, LowTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([MidConga, MidTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([HiConga, HiTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([Clave, RimShot], [new LevelKnob()]),
      new Channel([Maracas, Clap], [new LevelKnob()]),
      new Channel([CowBell], [new LevelKnob()]),
      new Channel([Cymbal], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([OpenHats], [new LevelKnob(), new DecayKnob()]),
      new Channel([ClosedHats], [new LevelKnob()])
    ];

  };
  save(override) {

    let name = override ? override : prompt('name?');

    if(!name) {return};

    name += ` @${this.bpmSelect.value}`;
    const existing = this.storage.get('patterns') || [];
    this.saved = [...existing, [name, this.bpmSelect.value, this.instruments]];

    this.storage.set('patterns', this.saved);
    this.renderPatternSelect();

    return this;

  };
  renderPatternSelect() {

    if(this.patternSelect) {
      this.patternSelect.parentNode.removeChild(this.patternSelect);
    };

    this.patternSelect = makeSelect(this.saved.map(([label], index) => [label, index]), this.saved.length-1);

    this.buttonsNode.appendChild(this.patternSelect);

    this.patternSelect.addEventListener('input', this.patternChangeHandler.bind(this));
    this.patternChangeHandler();

    return this;

  };
  patternChangeHandler() {

    this.bpmSelect.value = this.saved[this.patternSelect.value][1];
    this.instruments = this.saved[this.patternSelect.value][2];
    this.applyPattern();
    this.bpmChangeHandler();

  };
  bpmChangeHandler() {

    this.bpmDisplay.innerText = this.bpmSelect.value;

  };
  playing = false;
  stepLength = 16;
  currentStep = 0;
  modes = {
    '1/16': 15000,
    '1/8': 30000,
    '1/4': 60000
  };
  mode = '1/16';
};

class Knob extends DisplayObject {
  constructor() {

    super();

  };
  label = 'Knob';
};

class LevelKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Level';
};

class TuningKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Tuning';
};

class ToneKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Tone';
};

class DecayKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Decay';
};

class SnappyKnob extends Knob {
  constructor() {
    super();
  };
  label = 'Snappy';
};

class Switch extends DisplayObject {
  constructor() {
    super();
  };
};

class Variation extends DisplayObject {
  constructor() {
    super();
  };
};

class Instrument {
  constructor(name) {
    this.name = name;
  };
  play() {};
};

class Steps extends DisplayObject {
  constructor(seq, count = 16) {

    super();

    this.seq = seq;
    this.count = count;
    this.node = makeNode('div', 'steps');
    this.steps = this.make();

    this.render();

  };
  make() {

    let colorIndex = 0;

    return makeArray(this.count).map((index) => {
      const step = new Step(this.seq, this.stepColors[colorIndex], index);
      if(index > 0 && (index + 1) % 4 === 0) {
        colorIndex += 1;
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
  stepColors = ['red', 'orange', 'yellow', 'white'];
};

class Step extends DisplayObject {
  constructor(seq, color = 'red',  beat) {

    super();

    this.node = makeNode('div', 'step');
    this.indicator = makeNode('div', 'step-indicator');
    this.color = color;
    this.beat = beat;
    this.seq = seq;

    this.node.appendChild(this.indicator);

    this.setProp('enabled', this.enabled);
    this.setProp('color', this.color);

    this.addEventListener('click', () => {
      if(this.enabled) {
        this.disable();
      }
      else {
        this.enable();
      };
    });

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
  enable() {

    this.enabled = true;
    this.setProp('enabled', this.enabled);
    this.seq.enable(this.beat);
    return this;

  };
  disable() {

    this.enabled = false;
    this.setProp('enabled', this.enabled);
    this.seq.disable(this.beat);
    return this;

  };
  enabled = false;
  active = false;
};

class Channel {
  constructor(instruments, modifiers) {
    this.instruments = instruments;
    this.modifiers = modifiers;
  };
};

const sequencer = new Sequencer();

console.log(sequencer);

sequencer.appendTo(document.body);
