import {
  makeAndLinkProgram,
  Program,
  renderInProgram,
} from "../../../engine/src/swagl/Program.js";
import { Mat4fv } from "../../../engine/src/swagl/ProgramInput.js";

function onLoad() {
  const maybeCanvas = document.getElementById("canvas");
  /** @type {HTMLCanvasElement} */
  const canvas = maybeCanvas instanceof HTMLCanvasElement ? maybeCanvas : null;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = ratio * canvas.width;
  canvas.height = ratio * canvas.height;

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });

  gl.enable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  /** @type {!Program<{projection:Mat4fv}>} */
  const program = makeAndLinkProgram({
    name: "main",
    gl,
    inputs: {
      projection: new Mat4fv("u_projection"),
    },
    shaders: {
      vertex: {
        name: "vertex",
        code: `#version 300 es
in vec3 a_position;
uniform mat4 u_projection;

void main() {
  gl_Position = u_projection * vec4(a_position, 1);
}`,
      },
      fragment: {
        name: "fragment",
        code: `#version 300 es
precision highp float;

out vec4 output_color;

void main() {
  output_color = vec4(1.f, 1.f, 1.f, 1.f);
}`,
      },
    },
  });

  // prettier-ignore
  const testData = [
      1, 0, 0,
      0, 1, 0,
      -1, 0, 0,
      0, -1, 0,
    ];

  // const texture = gl.createTexture();

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(testData), gl.STATIC_DRAW);

  renderInProgram(program, (gl) => {
    // prettier-ignore
    program.inputs.projection.set(
      .5, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const position = program.attr("a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_LOOP, 0, testData.length / 3);
  });
}

window.onload = onLoad;
