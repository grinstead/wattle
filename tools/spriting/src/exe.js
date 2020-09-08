import {
  makeAndLinkProgram,
  Program,
  renderInProgram,
  Mat4fv,
} from "../../../engine/src/swagl/index.js";

function onLoad() {
  const maybeCanvas = document.getElementById("canvas");
  /** @type {HTMLCanvasElement} */
  const canvas = maybeCanvas instanceof HTMLCanvasElement ? maybeCanvas : null;
  const gl = canvas.getContext("webgl2");

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
in vec2 a_texturePosition;
uniform mat4 u_projection;

out vec2 v_texturePosition;

void main() {
  gl_Position = u_projection * vec4(a_position, 1);
  v_texturePosition = a_texturePosition;
}`,
      },
      fragment: {
        name: "fragment",
        code: `#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_texturePosition;
out vec4 output_color;

void main() {
    vec4 color = texture(u_texture, v_texturePosition.st);
    if (color.a == 0.0) {
        discard;
    }
    output_color = color;
}`,
      },
    },
  });

  renderInProgram(program, (gl) => {
    // prettier-ignore
    program.inputs.projection.set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
  });

  console.log("hi", program);
}

window.onload = onLoad;
