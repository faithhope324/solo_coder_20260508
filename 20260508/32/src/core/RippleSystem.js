import * as THREE from 'three';

export class RippleSystem {
  constructor(maxRipples = 8, lifespan = 6.0) {
    this.maxRipples = maxRipples;
    this.lifespan = lifespan;
    this.ripples = [];
  }

  addRipple(position) {
    const ripple = {
      position: position.clone(),
      age: 0,
      maxAge: this.lifespan
    };

    if (this.ripples.length >= this.maxRipples) {
      this.ripples.shift();
    }
    
    this.ripples.push(ripple);
  }

  update(deltaTime) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age += deltaTime;
      
      if (this.ripples[i].age >= this.ripples[i].maxAge) {
        this.ripples.splice(i, 1);
      }
    }
  }

  getActiveRipples() {
    return this.ripples;
  }

  clear() {
    this.ripples = [];
  }

  getRippleCount() {
    return this.ripples.length;
  }
}
