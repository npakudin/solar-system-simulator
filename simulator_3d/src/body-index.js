export class BodyIndex {
  constructor(bodies) {
    this._map = new Map(bodies.map(b => [b.name, b]));
  }

  get(name) {
    const b = this._map.get(name);
    if (!b) throw new Error(`Body not found: ${name}`);
    return b;
  }

  has(name) { return this._map.has(name); }

  get earth()   { return this.get('Earth'); }
  get moon()    { return this.get('Moon'); }
  get sun()     { return this.get('Sun'); }
  get iss()     { return this.get('ISS'); }
  get rocket()  { return this.get('Rocket'); }
}
