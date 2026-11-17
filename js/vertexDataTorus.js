
/* Torus als parametrisierte Fläche */


var torus = (function () {

  var COLOR_OUTER = [0.86, 0.63, 0.36];
  var COLOR_INNER = [0.34, 0.24, 0.17];

  function mixColor(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function createVertexData() {
    var n = 40;
    var m = 16;

    var R = 1.85;
    var r = 0.13;
    var centerY = 1;

    // Der Ring liegt nicht flach in der XZ-Ebene, sondern um X-Achse geneigt
    var tilt = 18 * Math.PI / 180;
    var cosTilt = Math.cos(tilt);
    var sinTilt = Math.sin(tilt);

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

    var du = 2 * Math.PI / n;
    var dv = 2 * Math.PI / m;

    var iLines = 0;
    var iTris = 0;

    // Loop über den inneren Kreis u und den äußeren Kreis v
    for (var i = 0, u = -Math.PI; i <= n; i++, u += du) {
      for (var j = 0, v = 0; j <= m; j++, v += dv) {

        var iVertex = i * (m + 1) + j;

        var radius = R + r * Math.cos(v);
        var radialX = radius * Math.cos(u);
        var radialZ = radius * Math.sin(u);

        // Neigung um die X-Achse: y und z werden gedreht, x bleibt
        var x = radialX;
        var y = centerY + r * Math.sin(v) * cosTilt - radialZ * sinTilt;
        var z = r * Math.sin(v) * sinTilt + radialZ * cosTilt;

        vertices[iVertex * 3] = x;
        vertices[iVertex * 3 + 1] = y;
        vertices[iVertex * 3 + 2] = z;

        var normalX = Math.cos(v) * Math.cos(u);
        var normalY = Math.sin(v);
        var normalZ = Math.cos(v) * Math.sin(u);

        normals[iVertex * 3] = normalX;
        normals[iVertex * 3 + 1] = normalY * cosTilt - normalZ * sinTilt;
        normals[iVertex * 3 + 2] = normalY * sinTilt + normalZ * cosTilt;

        // Auf der Aussenseite des Rohres heller, auf der Innenseite dunkler
        var color = mixColor(COLOR_INNER, COLOR_OUTER, (1 + Math.cos(v)) / 2);
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
