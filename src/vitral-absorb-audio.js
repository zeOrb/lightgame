import {RandomManager} from './random-manager.js';
// Plucked strings followed by inharmonic glass resonances. No external assets.
export function playVitralAbsorb(context){
  const start=context.currentTime,master=context.createGain(),filter=context.createBiquadFilter();
  master.gain.value=.7;filter.type='lowpass';filter.frequency.setValueAtTime(8200,start);filter.frequency.exponentialRampToValueAtTime(1800,start+2.3);
  master.connect(filter);filter.connect(context.destination);
  let voices=0;
  const voice=(frequency,time,length,volume,type='sine',bend=1)=>{
    const osc=context.createOscillator(),envelope=context.createGain();voices++;
    osc.type=type;osc.frequency.setValueAtTime(frequency,time);osc.frequency.exponentialRampToValueAtTime(frequency*bend,time+length);
    envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(volume,time+.004);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.28),time+length*.24);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+length);
    osc.connect(envelope);envelope.connect(master);osc.start(time);osc.stop(time+length+.02);
    osc.onended=()=>{osc.disconnect();envelope.disconnect();if(--voices===0){master.disconnect();filter.disconnect();}};
  };
  const variation=Math.pow(2,(RandomManager.graphics()-.5)*.08/12);
  for(const [i,note] of [587.33,880,1174.66,1479.98].entries()){
    const time=start+i*.28,frequency=note*variation;
    voice(frequency,time,1.25-i*.07,.035-i*.004,'triangle');
    voice(frequency*2.003,time,.48,.009-i*.001);
  }
  for(const [i,partial] of [1387,2131,3167,4381,6233].entries()){
    voice(partial*(.99+RandomManager.graphics()*.02),start+.35+i*.045,1.8-i*.16,.010/(1+i*.45),'sine',.975);
  }
  // Soft bowed friction: a slow upward glissando under the harp and glass.
  const bow=context.createOscillator(),bowFilter=context.createBiquadFilter(),bowGain=context.createGain();
  const vibrato=context.createOscillator(),vibratoGain=context.createGain(),end=start+2.15;
  voices++;bow.type='sawtooth';bow.frequency.setValueAtTime(196*variation,start);
  bow.frequency.exponentialRampToValueAtTime(523.25*variation,end);
  bowFilter.type='bandpass';bowFilter.Q.value=.85;bowFilter.frequency.setValueAtTime(650,start);bowFilter.frequency.exponentialRampToValueAtTime(1550,end);
  bowGain.gain.setValueAtTime(0,start);bowGain.gain.linearRampToValueAtTime(.008,start+.3);
  bowGain.gain.linearRampToValueAtTime(.014,start+1.1);bowGain.gain.exponentialRampToValueAtTime(.0001,end);
  vibrato.frequency.setValueAtTime(4.4,start);vibratoGain.gain.setValueAtTime(3,start);vibratoGain.gain.linearRampToValueAtTime(9,end);
  vibrato.connect(vibratoGain);vibratoGain.connect(bow.detune);
  bow.connect(bowFilter);bowFilter.connect(bowGain);bowGain.connect(master);
  bow.start(start);vibrato.start(start);bow.stop(end+.02);vibrato.stop(end+.02);
  bow.onended=()=>{bow.disconnect();bowFilter.disconnect();bowGain.disconnect();vibrato.disconnect();vibratoGain.disconnect();if(--voices===0){master.disconnect();filter.disconnect();}};
}
