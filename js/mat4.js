/* Matrix-Hilfe für View und Projektions-Transformation, Matrizen werden spaltenweise (column-major) abgelegt. */

var mat4 = (function () {

  function create() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  function identity(out) {
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  }

  function length(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  // View-Matrix,  Kamera in eye blickt auf center, up zeigt nach oben
  function lookAt(out, eye, center, up) {
    var fx = center[0] - eye[0];
    var fy = center[1] - eye[1];
    var fz = center[2] - eye[2];

    var forward = [fx, fy, fz];
    var forwardLength = length(forward);
    if (forwardLength === 0) return identity(out);
    fx /= forwardLength; fy /= forwardLength; fz /= forwardLength;

    // side = forward x up
    var sx = fy * up[2] - fz * up[1];
    var sy = fz * up[0] - fx * up[2];
    var sz = fx * up[1] - fy * up[0];

    var sideLength = length([sx, sy, sz]);
    if (sideLength === 0) return identity(out);
    sx /= sideLength; sy /= sideLength; sz /= sideLength;

    // up = side x forward
    var ux = sy * fz - sz * fy;
    var uy = sz * fx - sx * fz;
    var uz = sx * fy - sy * fx;

    out[0] = sx; out[1] = ux; out[2] = -fx; out[3] = 0;
    out[4] = sy; out[5] = uy; out[6] = -fy; out[7] = 0;
    out[8] = sz; out[9] = uz; out[10] = -fz; out[11] = 0;
    out[12] = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
    out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
    out[14] = (fx * eye[0] + fy * eye[1] + fz * eye[2]);
    out[15] = 1;
    return out;
  }
  
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    var nf = 1 / (near - far);

    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }

  return {
    create : create,
    identity : identity,
    lookAt : lookAt,
    perspective : perspective
  };

}());
