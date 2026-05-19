import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

export class MobiusGeometry {
    constructor(params = {}) {
        this.params = {
            radius: params.radius || 5,
            width: params.width || 2,
            twist: params.twist || 1,
            segments: params.segments || 100,
            widthSegments: params.widthSegments || 20
        };
        
        this.geometry = null;
        this.createGeometry();
    }
    
    createGeometry() {
        const { radius, width, twist, segments, widthSegments } = this.params;
        
        this.geometry = new ParametricGeometry(
            (u, v, target) => {
                u = u * Math.PI * 2;
                v = (v - 0.5) * width;
                
                const halfWidth = v;
                const angle = u;
                const twistAngle = u * twist;
                
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const cosTwist = Math.cos(twistAngle);
                const sinTwist = Math.sin(twistAngle);
                
                const x = (radius + halfWidth * cosTwist) * cos;
                const y = halfWidth * sinTwist;
                const z = (radius + halfWidth * cosTwist) * sin;
                
                target.set(x, y, z);
            },
            segments,
            widthSegments
        );
        
        this.geometry.computeVertexNormals();
        
        return this.geometry;
    }
    
    updateParams(newParams) {
        const needsRecreate = 
            newParams.segments !== this.params.segments ||
            newParams.widthSegments !== this.params.widthSegments;
        
        Object.assign(this.params, newParams);
        
        if (needsRecreate) {
            this.geometry.dispose();
            this.createGeometry();
        } else {
            this.updateVertices();
        }
        
        return this.geometry;
    }
    
    updateVertices() {
        const { radius, width, twist, segments, widthSegments } = this.params;
        const positions = this.geometry.attributes.position;
        
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= widthSegments; j++) {
                const index = i * (widthSegments + 1) + j;
                
                const u = i / segments * Math.PI * 2;
                const v = (j / widthSegments - 0.5) * width;
                
                const halfWidth = v;
                const angle = u;
                const twistAngle = u * twist;
                
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const cosTwist = Math.cos(twistAngle);
                const sinTwist = Math.sin(twistAngle);
                
                const x = (radius + halfWidth * cosTwist) * cos;
                const y = halfWidth * sinTwist;
                const z = (radius + halfWidth * cosTwist) * sin;
                
                positions.setXYZ(index, x, y, z);
            }
        }
        
        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
    }
    
    getVertexCount() {
        return this.geometry.attributes.position.count;
    }
    
    dispose() {
        if (this.geometry) {
            this.geometry.dispose();
        }
    }
}
