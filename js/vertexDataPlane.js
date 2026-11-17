
/* Gitterebene in der XZ-Ebene als räumliche Referenz der Szene */


var plane = (function () {

  var COLOR_CENTER = [0.42, 0.52, 0.62];
  var COLOR_EDGE = [0.11, 0.15, 0.20];

  function mixColor(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function createVertexData() {
    var n = 40;
    var m = 40;
    var half = 5;

    this.vertices = new Float32Array(3 * (n + 1) * (m + 1));
    this.normals = new Float32Array(3 * (n + 1) * (m + 1));
    this.colors = new Float32Array(3 * (n + 1) * (m + 1));
    this.indicesLines = new Uint16Array(2 * 2 * n * m);
    this.indicesTris = new Uint16Array(3 * 2 * n * m);

    var vertices = this.vertices;
    var normals = this.normals;
    var colors = this.colors;
    var indicesLines = this.indicesLines;
    var indicesTris = this.indicesTris;

    var du = 2 * half / n;
    var dv = 2 * half / m;

    var iLines = 0;
    var iTris = 0;

    for (var i = 0, u = -half; i <= n; i++, u += du) {
      for (var j = 0, v = -half; j <= m; j++, v += dv) {

        var iVertex = i * (m + 1) + j;

        vertices[iVertex * 3] = u;
        vertices[iVertex * 3 + 1] = 0;
        vertices[iVertex * 3 + 2] = v;

        normals[iVertex * 3] = 0;
        normals[iVertex * 3 + 1] = 1;
        normals[iVertex * 3 + 2] = 0;

        // Das Gitter wird nach außen hin etwas dunkler
        var distance = Math.max(Math.abs(u), Math.abs(v)) / half;
        var color = mixColor(COLOR_CENTER, COLOR_EDGE, distance);
        colors[iVertex * 3] = color[0];
        colors[iVertex * 3 + 1] = color[1];
        colors[iVertex * 3 + 2] = color[2];

        if (j > 0 && i > 0) {
          indicesLines[iLines++] = iVertex - 1;
          indicesLines[iLines++] = iVertex;
          indicesLines[iLines++] = iVertex - (m + 1);
          indicesLines[iLines++] = iVertex;

          indicesTris[iTris++] = iVertex;
          indicesTris[iTris++] = iVertex - 1;
          indicesTris[iTris++] = iVertex - (m + 1);

          indicesTris[iTris++] = iVertex - 1;
          indicesTris[iTris++] = iVertex - (m + 1) - 1;
          indicesTris[iTris++] = iVertex - (m + 1);
        }
      }
    }
  }

  return {
    createVertexData : createVertexData
  };

}());
