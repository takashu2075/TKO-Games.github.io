import * as THREE from './lib/three/build/three.module.js';
import * as CANNON from './lib/cannon-es/dist/cannon-es.js';
import { ConvexGeometry } from 'https://unpkg.com/three@0.122.0/examples/jsm/geometries/ConvexGeometry.js'
import { OBJLoader } from './lib/three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from './lib/three/examples/jsm/loaders/MTLLoader.js';

async function loadFile(path) {
    await fetch(path).then((res) => {
        if (!res.ok) {
            throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.result;
    }).catch((error) => {
        throw new Error(error);
    });
}

async function loadJson(path) {
    return await fetch(
        path
    ).then((response) => {
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.json();
    }).catch((error) => {
        throw new Error(error);
    });
}

function loadTexture(path) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(path, function(texture) {
            texture.wrapS = THREE.MirroredRepeatWrapping;
            texture.wrapT = THREE.MirroredRepeatWrapping;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            texture.generateMipmaps = true;
            texture.needsUpdate = true;
            resolve(texture);
        });
    });
}

function loadDataTexture(path) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.DataTextureLoader();
        loader.load(path, function(texture) {
            // texture.wrapS = THREE.MirroredRepeatWrapping;
            // texture.wrapT = THREE.MirroredRepeatWrapping;
            // texture.magFilter = THREE.LinearFilter;
            // texture.minFilter = THREE.LinearMipMapLinearFilter;
            // texture.generateMipmaps = true;
            // texture.needsUpdate = true;
            resolve(texture);
        });
    });
}

function loadObjFile(geometryPath, materialPath) {
    return new Promise((resolve, refect) => {
        const mtlLoader = new MTLLoader();
        if (materialPath) {
            mtlLoader.load(materialPath, (mtl) => {
                mtl.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(mtl);
                objLoader.load(geometryPath, (root) => {
                    resolve(root.children[0]);
                });
            });
        } else {
            objLoader.load(geometryPath, (root) => {
                resolve(root.children[0]);
            });
        }
    });
}

function createTextureArray(textures) {
    const width = 1024;
    const height = 1024;
    const depth = textures.length;

    const size = width * height;
    const data = new Uint8Array( 3 * size * depth );

    for (let i = 0; i < depth; i++) {
        const imageData = getImageData(textures[i].image).data;
        for (let j = 0; j < size; j++) {
            const stride = (i * size + j) * 3;
            data[stride] = imageData[j * 4];
            data[stride + 1] = imageData[j * 4 + 1];
            data[stride + 2] = imageData[j * 4 + 2];
        }
    }
    const result = new THREE.DataTexture2DArray( data, width, height, depth );
    result.format = THREE.RGBFormat;
    result.type = THREE.UnsignedByteType;

    result.wrapS = THREE.MirroredRepeatWrapping;
    result.wrapT = THREE.MirroredRepeatWrapping;
    result.magFilter = THREE.LinearMipMapLinearFilter;
    result.minFilter = THREE.LinearMipMapLinearFilter;
    result.generateMipmaps = true;
    result.needsUpdate = true;

    return result;
}

function getImageData(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d');
    context.drawImage( image, 0, 0 );

    return context.getImageData(0, 0, image.width, image.height);
}

// // https://pmndrs.github.io/cannon-es/examples/js/three-conversion-utils.js
// function convGeometry2Mesh(geometry) {
//     // Simplify the geometry if it has too many points,
//     // make it have no more than MAX_VERTEX_COUNT vertices
//     // const vertexCount = geometry.isBufferGeometry ? geometry.attributes.position.count : geometry.vertices.length

//     // const MAX_VERTEX_COUNT = 150
//     // const simplifiedGeometry = new SimplifyModifier().modify(geometry, Math.max(vertexCount - MAX_VERTEX_COUNT, 0))

//     // const points = new THREE.Geometry().fromBufferGeometry(simplifiedGeometry).vertices;

//     const positionAttribute = geometry.attributes.position;
//     const points = [];
//     for (let i = 0; i < positionAttribute.count; i++) {
//         const pos = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
//         pos.x;
//         pos.y;
//         pos.z;
//         points.push(pos);
//     }

//     // Generate convex hull
//     const hullGeometry = new ConvexGeometry(points)

//     const vertices = hullGeometry.vertices.map((v) => new CANNON.Vec3().copy(v))
//     const faces = hullGeometry.faces.map((f) => [f.a, f.b, f.c])
//     const normals = hullGeometry.faces.map((f) => new CANNON.Vec3().copy(f.normal))

//     // Construct polyhedron
//     const polyhedron = new CANNON.ConvexPolyhedron({ vertices, faces, normals })

//     return polyhedron
// }


function convGeometry2Mesh(geometry) {
    const vertices = [];
    const positions = geometry.attributes.position.array;
    for (const data of positions) {
        vertices.push(data);
    }

    // const vertices = [];
    // const positionAttribute = geometry.attributes.position;
    // for (let i = 0; i < positionAttribute.count; i++) {
    //     const pos = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
    //     vertices.push(pos.z);
    //     vertices.push(pos.y);
    //     vertices.push(pos.x);
    // }

    const indices = [];
    const indexes = geometry.index.array;
    for (const data of indexes) {
        indices.push(data);
    }

    return new CANNON.Trimesh(vertices, indices);
}

function convGeometry2Heightfield(geometry) {
    const count = geometry.attributes.position.count;
    const positions = geometry.attributes.position.array;

    // Create a matrix of height values
    const size = Math.sqrt(count);
    const data = [];

    for (let x = 0; x < size; x++) {
        data.push([]);
        for (let z = 0; z < size; z++) {
            const height = positions[(size * ((size - 1) - z) + x) * 3 + 1];
            data[x].push(height);
        }
    }

    return new CANNON.Heightfield(data, { elementSize: 3000 / 32 });
}

export { loadFile, loadJson, loadTexture, loadDataTexture, loadObjFile, createTextureArray, getImageData, convGeometry2Mesh, convGeometry2Heightfield };
