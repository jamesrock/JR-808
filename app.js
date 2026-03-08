import '/app.css';
import {
  SoundManager,
  DisplayObject,
  makeArray,
  makeInput,
  makeButton,
  makeNode,
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

class Sequencer extends DisplayObject {
  constructor() {

    super();

    this.node = makeNode('div', 'step-sequencer');

    this.steps = new Steps(this);
    this.channels = [
      new Channel([ACcent], [new LevelKnob()]),
      new Channel([BassDrum], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([SnareDrum], [new LevelKnob(), new ToneKnob(), new SnappyKnob()]),
      new Channel([LowConga, LowTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([MidConga, MidTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([HiConga, HiTom], [new LevelKnob(), new TuningKnob()]),
      new Channel([CLave, RimShot], [new LevelKnob()]),
      new Channel([MAracas, handClaP], [new LevelKnob()]),
      new Channel([CowBell], [new LevelKnob()]),
      new Channel([CYmbal], [new LevelKnob(), new ToneKnob(), new DecayKnob()]),
      new Channel([OpenHats], [new LevelKnob(), new DecayKnob()]),
      new Channel([ClosedHats], [new LevelKnob()])
    ];
    this.sounds = new SoundManager({
      'kick': '/audio/kick.mp3',
      'snare': '/audio/snare.mp3',
      'hats-closed': '/audio/hats-closed.mp3',
      // 'clap': '',
      // 'hats-open': '',
      // 'crash': '',
      // 'ride': '',
    });
    this.instruments = [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];
    this.instrument = 0;
    this.keys = Object.keys(this.sounds.sounds);
    this.instrumentSelect = makeSelect(this.keys.map((inst, index) => [inst, index]));
    this.startButton = makeButton('start');
    this.bpmSelect = makeSlider(120, 60, 200);
    this.bpmDisplay = makeNode('div', 'bpm-display');

    this.node.appendChild(this.bpmSelect);
    this.node.appendChild(this.bpmDisplay);
    this.node.appendChild(this.instrumentSelect);
    this.node.appendChild(this.startButton);
    this.steps.appendTo(this.node);

    this.startButton.addEventListener('click', () => {

      if(this.playing) {
        this.stop();
        this.startButton.innerText = 'play';
      }
      else {
        this.start();
        this.startButton.innerText = 'stop';
      };

    });

    const bpmChangeHandler = () => {

      this.bpmDisplay.innerText = this.bpmSelect.value;

    };

    this.bpmSelect.addEventListener('input', bpmChangeHandler);
    bpmChangeHandler();

    this.instrumentSelect.addEventListener('input', () => {
      // re-apply enabled states based on instruments array
      this.steps.steps.forEach((step, index) => {
        if(this.instruments[this.instrumentSelect.value][index]) {
          step.enable();
        }
        else {
          step.disable();
        };
      });

    });

    this.sounds.load();

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

    this.instruments[this.instrumentSelect.value][beat] = 1;

  };
  disable(beat) {

    this.instruments[this.instrumentSelect.value][beat] = 0;

  };
  playing = false;
  stepCount = 16;
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

const ACcent = new Instrument('ACcent');
const BassDrum = new Instrument('BassDrum');
const SnareDrum = new Instrument('SnareDrum');
const LowConga = new Instrument('LowConga');
const LowTom = new Instrument('LowTom');
const MidConga = new Instrument('MidConga');
const MidTom = new Instrument('MidTom');
const HiConga = new Instrument('HiConga');
const HiTom = new Instrument('HiTom');
const CLave = new Instrument('CLave');
const RimShot = new Instrument('RimShot');
const MAracas = new Instrument('MAracas');
const handClaP = new Instrument('handClaP');
const CowBell = new Instrument('CowBell');
const CYmbal = new Instrument('CYmbal');
const OpenHats = new Instrument('OpenHats');
const ClosedHats = new Instrument('ClosedHats');
const sequencer = new Sequencer();

console.log(sequencer);

sequencer.appendTo(document.body);
