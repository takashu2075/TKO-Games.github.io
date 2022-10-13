import * as THREE from '../../lib/three/build/three.module.js';
import { ShaderPass } from '../../lib/three/examples/jsm/postprocessing/ShaderPass.js';

export default function WorleyNoisePass(renderTargets) {
    const shaderPass = new ShaderPass({
        vertexShader: `
            varying vec2 vUv;

            void main(void) {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            const int nResolution = 512;
            const float fShapeAttenuation = 0.5;
            const vec2 offset = vec2(50.0, 50.0);

            varying vec2 vUv;

            vec2 rand2(vec2 p) {
                float x = p.x * 127.1 + p.y * 311.7;
                float y = p.x * 269.5 + p.y * 183.3;

                vec2 vec = vec2(sin(x) * 43758.5453, sin(y) * 43758.5453);

                return vec2(vec.x - floor(vec.x), vec.y - floor(vec.y));
            }

            float worley2(vec2 v2Pos, int nRes, int nSeg) {
                float fRes = float(nRes);
                float fSeg = float(nSeg);

                vec2 v2St = vec2(v2Pos.x / (fRes - 1.0), v2Pos.y / (fRes - 1.0));
                v2St *= fSeg;

                vec2 v2IntSt = floor(v2St);
                vec2 v2FloatSt = v2St - v2IntSt;

                float fMinDist = 1.0;  // minimum distance

                for (int x = -1; x <= 1; x++) {
                    for (int y = -1; y <= 1; y++) {
                        // Neighbor place in the grid
                        vec2 v2Neighbor = vec2(float(x), float(y));

                        // Random position from current + neighbor place in the grid
                        vec2 v2Tmp = v2IntSt + v2Neighbor;
                        if (v2Tmp.x == -1.0) {
                            v2Tmp.x = fSeg - 1.0;
                        } else if (v2Tmp.x >= fSeg) {
                            v2Tmp.x = 0.0;
                        }
                        if (v2Tmp.y == -1.0) {
                            v2Tmp.y = fSeg - 1.0;
                        } else if (v2Tmp.y >= fSeg) {
                            v2Tmp.y = 0.0;
                        }

                        //var point = random3(i_st.clone().add(neighbor));
                        vec2 v2Point = rand2(v2Tmp);

                        // Vector between the pixel and the point
                        vec2 v2Diff = v2Neighbor + v2Point - v2FloatSt;

                        // Distance to the point
                        float fDist = length(v2Diff);

                        // Keep the closer distance
                        fMinDist = min(fMinDist, fDist);
                    }
                }

                // Draw the min distance (distance field)
                return 1.0 - fMinDist;
            }

            vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
            }

            vec2 mod289(vec2 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
            }

            vec3 permute(vec3 x) {
            return mod289(((x*34.0)+1.0)*x);
            }

            float snoise(vec2 v)
            {
            const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                                0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                                -0.577350269189626,  // -1.0 + 2.0 * C.x
                                0.024390243902439); // 1.0 / 41.0
            // First corner
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);

            // Other corners
            vec2 i1;
            //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
            //i1.y = 1.0 - i1.x;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            // x0 = x0 - 0.0 + 0.0 * C.xx ;
            // x1 = x0 - i1 + 1.0 * C.xx ;
            // x2 = x0 - 1.0 + 2.0 * C.xx ;
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;

            // Permutations
            i = mod289(i); // Avoid truncation effects in permutation
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                    + i.x + vec3(0.0, i1.x, 1.0 ));

            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;

            // Gradients: 41 points uniformly over a line, mapped onto a diamond.
            // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;

            // Normalise gradients implicitly by scaling m
            // Approximation of: m *= inversesqrt( a0*a0 + h*h );
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

            // Compute final noise value at P
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
            }

            void main(void) {
                vec2 v2Pos = vec2(floor(vUv.x * float(nResolution)), floor(vUv.y * float(nResolution)));
                vec2 v2OffsetPos = v2Pos + offset;

                float fDensity = 0.5 + (
                    0.0
                        //+ (snoise(v2OffsetPos * 0.0025) + 1.0) * 0.5 * pow(fShapeAttenuation, 0.0)
                        //+ (snoise(v2OffsetPos * 0.005) + 1.0) * 0.5 * pow(fShapeAttenuation, 1.0)
                        //+ (snoise(v2OffsetPos * 0.01) + 1.0) * 0.5 * pow(fShapeAttenuation, 2.0)
                        //+ (snoise(v2OffsetPos * 0.02) + 1.0) * 0.5 * pow(fShapeAttenuation, 3.0)
                        //+ (snoise(v2OffsetPos * 0.04) + 1.0) * 0.5 * pow(fShapeAttenuation, 4.0)
                        //+ (snoise(v2OffsetPos * 0.08) + 1.0) * 0.5 * pow(fShapeAttenuation, 5.0)
                        //+ (snoise(v2OffsetPos * 0.16) + 1.0) * 0.5 * pow(fShapeAttenuation, 6.0)
                        //+ (snoise(v2OffsetPos * 0.32) + 1.0) * 0.5 * pow(fShapeAttenuation, 4.0)
                        //+ (snoise(v2OffsetPos * 0.64) + 1.0) * 0.5 * pow(fShapeAttenuation, 5.0)


                        //+ worley2(v2Pos, nResolution, 1) * pow(fShapeAttenuation, 0.0)
                        //+ worley2(v2Pos, nResolution, 2) * 1.0
                        // + worley2(v2OffsetPos, nResolution, 4)// * pow(fShapeAttenuation, 1.0)
                        + worley2(v2OffsetPos, nResolution, 8) * pow(fShapeAttenuation, 0.0)
                        + worley2(v2OffsetPos, nResolution, 16) * pow(fShapeAttenuation, 1.0)
                        + worley2(v2OffsetPos, nResolution, 32) * pow(fShapeAttenuation, 2.0)
                        + worley2(v2OffsetPos, nResolution, 64) * pow(fShapeAttenuation, 3.0)
                        //+ worley2(v2Pos, nResolution, 128) * pow(fShapeAttenuation, 4.0)
                        //+ worley2(v2Pos, nResolution, 64) * pow(fShapeAttenuation, 5.0)
                ) * 0.3;

                gl_FragColor.rgb = vec3(1.0, 1.0, 1.0) * fDensity;
                gl_FragColor.a = 1.0;

                vec2 screenPosition = vec2((vUv - 0.5) * 2.0);
                float distanceFromCenter = length(screenPosition) * 0.85;
                gl_FragColor.rgb = (gl_FragColor.rgb * 1.2 - (exp(distanceFromCenter) - 1.0));
            }
        `,
        uniforms: {
        },
    });

    shaderPass.update = function() {
    }

    return shaderPass;
}
