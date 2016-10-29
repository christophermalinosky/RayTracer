
//Objects
//Represents the pixels that will be drawn to the screen
class PixelBuffer {
    constructor(height, width, defaultColor) {
        this.height = height;
        this.width = width;
        this.defaultColor = defaultColor;

        this.colorArray = [];
        for ( let i = 0; i < this.height; i++ ) {
            this.colorArray[i] = [];
            for( let j = 0; j < this.width; j++ ) {
                this.colorArray[i][j] = defaultColor;
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

//Panel that the viewer looks through to see the scene
class ViewPanel{
    constructor(topLeft, topRight, bottomLeft, pixelRows, pixelColumns){
        this.topLeft = topLeft;
        this.topRight = topRight;
        this.bottomLeft = bottomLeft;
        this.pixelRows = pixelRows;
        this.pixelColumns = pixelColumns;

        this.displaceXrow = (bottomLeft[0] - topLeft[0])/pixelRows;
        this.displaceYrow = (bottomLeft[1] - topLeft[1])/pixelRows;
        this.displaceZrow = (bottomLeft[2] - topLeft[2])/pixelRows;

        this.displaceXcolumn = (topRight[0] - topLeft[0])/pixelColumns;
        this.displaceYcolumn = (topRight[1] - topLeft[1])/pixelColumns;
        this.displaceZcolumn = (topRight[2] - topLeft[2])/pixelColumns;
    }

    getCenter(row, column){
        return vec3(
            (row+0.5)*displaceXrow + (column+0.5)*displaceXcolumn + topLeft[0],
            (row+0.5)*displaceYrow + (column+0.5)*displaceYcolumn + topLeft[1],
            (row+0.5)*displaceZrow + (column+0.5)*displaceZcolumn + topLeft[2]
            );
    }
}

//Clipping cube of the scene
class ClippingCube{
    constructor(triangles){
        this.triangles = triangles;
    }

    getRayInCube(ray){
        let intersectionTs = [];
        for(let i = 0; i < this.triangles.length; i++){
            let intersectT = this.triangles[i].getIntersectionT(ray);
            if(intersectT){
                intersectionTs.push(intersectT);
            }
        }
        if(intersectionTs.length === 2){
            let point1 = ray.getPointAtT(intersectionTs[0]);
            let point2 = ray.getPointAtT(intersectionTs[1]);
            if(intersectionTs[0] < intersectionTs[1]){
                return new Ray(point1,point2);
            }
            return new Ray(point2,point1);
        } else {
            return false;
        }
    }
}

//Models an object in the scene
class Model{
    constructor(triangles){
        this.triangles = triangles;
    }

    getIntersectionTriangle(ray){
        let minimumT = this.triangles[0].getIntersectionT(ray);
        let minimumTriangle = this.triangles[0];
        for(let i = 1; i < this.triangles.length; i++){
            let intersectT = this.triangles[i].getIntersectionT(ray);
            if(intersectT){
                if(!minimumT || (intersectT < minimumT)){
                    minimumT = intersectT;
                    minimumTriangle = this.triangles[i];
                }
            }
        }
        return minimumTriangle;
    }
}

//Represents a ray
class Ray{
    constructor(startPoint, endPoint){
        this.startPoint = startPoint;
        this.endPoint = endPoint;
    }

    getPointAtT(t){
        return vex3(
            (endPoint[0] - startPoint[0])*t,
            (endPoint[1] - startPoint[1])*t,
            (endPoint[2] - startPoint[2])*t
            );
    }
}

//Represents a triangle
class Triangle{
    constructor(vertexes,color){
        this.vertexes = vertexes;
        this.color = color;
    }

    getNormal(){
        //TODO
    }

    getColor(){
        return this.color;
    }

    getIntersectionT(ray){
        //TODO
    }
}



//Globals needed for all the functions
let gl;
let points = [];

let height = 500;
let width = 500;
let colorArray = [];

var pixelBuffer = new PixelBuffer(500,500, vec4(0.0, 0.0, 0.0, 1.0));

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
