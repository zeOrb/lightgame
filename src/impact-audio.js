const buffers=new WeakMap();
export function playImpact(context,strong=false){
  const now=context.currentTime;
  for(const [type,frequency,volume,life] of [['sine',strong?130:180,.12,.16],['triangle',strong?880:1100,.045,.09]]){
    const osc=context.createOscillator(),gain=context.createGain();osc.type=type;
    osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(frequency*.24,now+life);
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+life);
    osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+life);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  let buffer=buffers.get(context);
  if(!buffer){buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.09),context.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;buffers.set(context,buffer);}
  const noise=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  noise.buffer=buffer;filter.type='highpass';filter.frequency.value=1400;
  gain.gain.setValueAtTime(.065,now);gain.gain.exponentialRampToValueAtTime(.001,now+.07);
  noise.connect(filter);filter.connect(gain);gain.connect(context.destination);noise.start(now);
  noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
}
