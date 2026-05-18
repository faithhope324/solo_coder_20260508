import * as THREE from 'three';

import { WaterRenderer } from './core/WaterRenderer';
import { WaterGeometry } from './core/WaterGeometry';
import { WaterMaterial } from './core/WaterMaterial';
import { RippleSystem } from './core/RippleSystem';
import { MousePicker } from './utils/MousePicker';

class App {
  constructor() {
    this.container = document.getElementById('app');
    
    this.onClick = this.onClick.bind(this);
    this.update = this.update.bind(this);
    
    this.init();
    this.setupWater();
    this.setupInteraction();
    this.start();
  }

  init() {
    this.renderer = new WaterRenderer(this.container);
  }

  setupWater() {
    this.waterGeometry = new WaterGeometry(80, 80, 256);
    this.waterMaterial = new WaterMaterial();
    
    this.waterMesh = new THREE.Mesh(
      this.waterGeometry.getGeometry(),
      this.waterMaterial.getMaterial()
    );
    
    this.renderer.addObject(this.waterMesh);
    this.rippleSystem = new RippleSystem(8, 8.0);
  }

  setupInteraction() {
    this.mousePicker = new MousePicker(
      this.renderer.getCamera(),
      this.renderer.getDomElement()
    );
    
    this.renderer.getDomElement().addEventListener(
      'click',
      this.onClick
    );
  }

  onClick(event) {
    const intersection = this.mousePicker.getIntersection(event);
    
    if (intersection) {
      const halfWidth = 40;
      const halfHeight = 40;
      
      if (
        intersection.x >= -halfWidth &&
        intersection.x <= halfWidth &&
        intersection.z >= -halfHeight &&
        intersection.z <= halfHeight
      ) {
        this.rippleSystem.addRipple(intersection);
      }
    }
  }

  update(deltaTime, elapsedTime) {
    this.rippleSystem.update(deltaTime);
    this.waterMaterial.updateTime(elapsedTime);
    this.waterMaterial.updateRipples(this.rippleSystem.getActiveRipples());
  }

  start() {
    this.renderer.startAnimationLoop(this.update);
  }

  dispose() {
    this.renderer.getDomElement().removeEventListener(
      'click',
      this.onClick
    );
    
    this.waterGeometry.dispose();
    this.waterMaterial.dispose();
    this.renderer.dispose();
  }
}

const app = new App();

window.addEventListener('beforeunload', () => {
  app.dispose();
});
