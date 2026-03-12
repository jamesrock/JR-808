export const setupChannelStrips = () => {

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

class Channel {
  constructor(instruments, modifiers) {
    this.instruments = instruments;
    this.modifiers = modifiers;
  };
};
