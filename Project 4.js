
//Objects
//Represents the pixels that will be drawn to the screen
class PixelBuffer {
    constructor(height, width) {
        this.height = height;
        this.width = width;

        this.colorArray = [];
        for ( let i = 0; i < this.height; i++ ) {
            this.colorArray[i] = [];
            for( let j = 0; j < this.width; j++ ) {
                this.colorArray[i][j] = vec4(0.0, 0.0, 0.0, 1.0);
            }
        }
    }

    getHeight() {
        return this.height;
    }

    getWidth() {
        return this.width;
    }

    setColor(row,column,color){
        this.colorArray[row][column] = color;
    }

    getColor(row,column){
        return this.colorArray[row][column];
    }

    //Draws the pixel to the point array that will be loaded into the gpu
    draw( pointArray ) {
        for ( let i = 0; i < this.height; i++ ) {
            for( let j = 0; j < this.width; j++ ) {
                let x0 = j*(2/this.width) - 1;
                let x1 = (j+1)*(2/this.width) - 1;
                let y0 = 1-i*(2/this.height);
                let y1 = 1-(i+1)*(2/this.height);
                pointArray.push(vec2(x0,y0));
                pointArray.push(vec2(x0,y1));
                pointArray.push(vec2(x1,y0));
                pointArray.push(vec2(x1,y1));
                pointArray.push(vec2(x0,y1));
                pointArray.push(vec2(x1,y0));
            }
        }
    }
}

//Stores viewer location
class Viewer {
    constructor(location){
        this.location = location;
    }

    getLocation(){
        return this.location;
    }
}

class ViewPanel{
    constructor(topLeft, bottomRight, pixelRows, pixelColumns){
        //TODO
    }

    getCenter(row, column){
        //TODO
    }
}

class ClippingCube{
    constructor(triangles){
        //TODO
    }

    getRayInCube(ray){
        //TODO
    }
}

class Model{
    constructor(triangles){
        //TODO
    }

    isIntersected(ray){
        //TODO
    }
}

class Ray{
    constructor(startPoint, endPoint){
        //TODO
    }
}

class Triangle{
    constructor(vertexes){
        //TODO
    }

    getNormal(){
        //TODO
    }

    isIntersected(ray){
        //TODO
    }
}



//Globals needed for all the functions
let gl;
let points = [];

let height = 500;
let width = 500;
let colorArray = [];

var pixelBuffer = new PixelBuffer(500,500);

window.onload = function init()
{
    let canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }


    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    let program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    for ( let i = 150; i < 200; i++ ) {
        pixelBuffer.setColor(0, i, vec4(1.0, 1.0, 0.0, 1.0));
    }

    pixelBuffer.draw(points)

    // Load the data into the GPU
    
    let bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate our shader variables with our data buffer
    
    let vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    colorLoc = gl.getUniformLocation (program, "color");

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    index = 0;
    for ( let i = 0; i < pixelBuffer.getHeight() ; i++ ) {
        for( let j = 0; j < pixelBuffer.getWidth() ; j++ ) {
            gl.uniform4fv(colorLoc, pixelBuffer.getColor(i,j));
            gl.drawArrays( gl.TRIANGLES, index, 6);
            index += 6;
        }
    }
}
