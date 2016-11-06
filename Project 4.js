// Define floating point EPSILON value
const EPSILON = 0.000001;


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

    setColor(row,column,color) {
        this.colorArray[row][column] = color;
    }

    getColor(row,column) {
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

    createViewPanel() {
        throw "Viewer.createViewPanel not implemented";
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
            (row+0.5)*this.displaceXrow + (column+0.5)*this.displaceXcolumn + this.topLeft[0],
            (row+0.5)*this.displaceYrow + (column+0.5)*this.displaceYcolumn + this.topLeft[1],
            (row+0.5)*this.displaceZrow + (column+0.5)*this.displaceZcolumn + this.topLeft[2]
            );
    }
}

//Clipping cube of the scene
class ClippingCube{
    constructor(x, y, z, s){
        this.triangles = Model.createCube(x, y, z, s, vec4(0,0,0,0)).triangles;
    }

    getRayInCube(ray){
        let intersectionTs = [];
        for(let i = 0; i < this.triangles.length; i++){
            let intersectT = this.triangles[i].getIntersectionT(ray);
            if(intersectT !== false && intersectionTs.length === 0){
                // console.log(intersectT);
                intersectionTs.push(intersectT);
            } else if(intersectT !== false && intersectionTs.length === 1 && intersectionTs[0] !== intersectT) {
                intersectionTs.push(intersectT);
            }
        }
        // console.log("Intersects:", intersectionTs);
        if(intersectionTs.length === 1) {
            let point1 = ray.getPointAtT(intersectionTs[0]);
            return new Ray(point1, point1);
        } else if(intersectionTs.length === 2) {
            // console.log("nofail")
            let point1 = ray.getPointAtT(intersectionTs[0]);
            let point2 = ray.getPointAtT(intersectionTs[1]);
            if(intersectionTs[0] < intersectionTs[1]) {
                return new Ray(point1,point2);
            }
            return new Ray(point2,point1);
        }
        return false;
    }

}

//Models an object in the scene
class Model{
    constructor(triangles, ambientConstant, diffusionConstant, specularConstant, shininess){
        this.triangles = triangles;
        this.ambientConstant = ambientConstant;
        this.diffusionConstant = diffusionConstant;
        this.specularConstant = specularConstant;
        this.shininess = shininess;
    }

    getIntersection(ray){
        let minimumT = false;
        let minimumTriangle = false;
        for(let i = 0; i < this.triangles.length; i++){
            let intersectT = this.triangles[i].getIntersectionT(ray);
            // console.log(intersectT);
            if(intersectT && (intersectT <= 1) && (intersectT >= 0)){
                if((minimumT === false)  || (intersectT < minimumT)){
                    minimumT = intersectT;
                    minimumTriangle = this.triangles[i];
                }
            }
        }
        if (minimumT !== false)
            return {
                triangle: minimumTriangle, 
                t: minimumT,
                ambientConstant: this.ambientConstant,
                diffusionConstant: this.diffusionConstant,
                specularConstant: this.specularConstant,
                shininess: this.shininess
            };
        else
            return false; // no intersection
    }

    static createCube(x, y, z, s, color, ambientConstant, diffusionConstant, specularConstant, shininess) {
        let p = [
            null, // started with 1 not 0, adding this is easier than changing numbers below
            vec3(x+s, y, z),
            vec3(x+s, y+s, z),
            vec3(x, y+s, z),
            vec3(x, y, z),
            vec3(x+s, y, z+s),
            vec3(x+s, y+s, z+s),
            vec3(x, y+s, z+s),
            vec3(x, y, z+s)
        ];
        let m =
            new Model([
                new Triangle([ p[1], p[2], p[4] ], color),
                new Triangle([ p[2], p[3], p[4] ], color),
                new Triangle([ p[5], p[6], p[1] ], color),
                new Triangle([ p[6], p[2], p[1] ], color),
                new Triangle([ p[4], p[3], p[7] ], color),
                new Triangle([ p[3], p[7], p[8] ], color),
                new Triangle([ p[7], p[6], p[8] ], color),
                new Triangle([ p[6], p[5], p[8] ], color),
                new Triangle([ p[3], p[2], p[7] ], color),
                new Triangle([ p[2], p[6], p[7] ], color),
                new Triangle([ p[1], p[4], p[8] ], color),
                new Triangle([ p[1], p[8], p[5] ], color)
            ], ambientConstant, diffusionConstant, specularConstant, shininess);
        return m;
        //what an amusing meme. it will return undefined if we do `return new Model(...);` but works fine when we do `let m = new Model(...); return m;`
    }
}

//Represents a ray
class Ray {
    constructor(startPoint, endPoint){
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.D = sub(endPoint, startPoint);
        //console.log("THe D: ", this.D)
    }

    getPointAtT(t){
        return vec3(
            this.startPoint[0] + (this.endPoint[0] - this.startPoint[0])*t,
            this.startPoint[1] + (this.endPoint[1] - this.startPoint[1])*t,
            this.startPoint[2] + (this.endPoint[2] - this.startPoint[2])*t
        );
    }
}

//Represents a triangle
class Triangle {
    //vertexes should be a list of 3 vec4 elements
    constructor(vertexes,color){
        this.vertexes = vertexes;
        this.color = color;
        // U and V used for normal and Möller–Trumbore
        this.U = sub(vertexes[1], vertexes[0]);
        this.V = sub(vertexes[2], vertexes[0]);
        //compute normal here so we only have to do that once, not every time we draw
        //counter-clockwise winding to match OpenGL/WebGL
        this.normal = cross(this.U, this.V)
    }

    getNormal(){
        return this.normal;
    }

    getColor(){
        return this.color;
    }

    // Implementation of Möller–Trumbore ray-triangle intersection algorithm
    getIntersectionT(ray){
        //console.log("Give em the D: ", ray.D, ray)
        let P = cross(ray.D, this.V);
        let det = dot(this.U, P);
        if (Math.abs(det) < EPSILON) // det ~= 0 ==> ray parallel to triangle ==> cull
            return false;
        let inv = 1.0/det;
        let T = sub(ray.startPoint, this.vertexes[0]);
        let u = dot(T, P) * inv;
        if ( (u < 0) || (u > 1.0) ) // outside triangle ==> cull
            return false;
        let Q = cross(T, this.U);
        let v = dot(ray.D, Q) * inv;
        if ( (v < 0) || ( u + v > 1.0) ) // outside triangle ==> cull
            return false;
        let t = dot(this.V, Q) * inv;
        // if ( t < 0 ) // triangle is behind start of ray ==> cull
        //     return NaN;
        // console.log("got t", t);
        return t;
    }
}

//Represents a point light source
class PointLightSource {
    constructor(position, intensity){
        this.position = position;
        this.intensity = intensity;
    }
}

// Vector helper functions
function sub(U, V) {
    return [
        U[0] - V[0],
        U[1] - V[1],
        U[2] - V[2]
    ];
}

function dot(U, V) {
    return (
        (U[0] * V[0]) +
        (U[1] * V[1]) +
        (U[2] * V[2])
    );
}

function cross(U, V) {
    return vec3(
        (U[1] * V[2]) - (U[2] * V[1]), // N.x = (U.y * V.z) - (U.z * V.y)
        (U[2] * V[0]) - (U[0] * V[2]), // N.y = (U.z * V.x) - (U.x * V.z)
        (U[0] * V[1]) - (U[1] * V[0]) // N.z = (U.x * V.y) - (U.y * V.x)
    );
}

function scale(C, V) {
    return vec3(
        C * V[0],
        C * V[1],
        C * V[2]
    );
}


//Globals needed for all the functions
let gl;
let points = [];

let height = 500;
let width = 500;
let colorArray = [];

//Lighting Globals
let a = 1;
let b = 0.05;
let c = 0.05;
let ambientIntensity = vec4(0.2, 0.2, 0.2, 1.0 );

var pixelBuffer = new PixelBuffer(width,height, vec4(0.0, 0.0, 0.0, 1.0));

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

    // Create scene

    console.log("CREATING MODELS AND LIGHTS...");

        let models = [
            Model.createCube(0, -2.5, -1, 1.5, vec4(0.0, 0.0, 1.0, 1.0), 1, 1, 1, 60),
            Model.createCube(-1, 2, -1, 1.5, vec4(0.0, 1.0, 0.0, 1.0), 1, 1, 1, 60),
            new Model([new Triangle([vec3(-3,-3,-3),vec3(3,-3,-3),vec3(-3,-3,4)],vec4(1,0,0,1)), new Triangle([vec3(-3,-3,4),vec3(3,-3,-3), vec3(3, -3, 4)],vec4(1,0,0,1))], 1, 1, 1, 60)
        ];

        let lightSource = new PointLightSource(vec3(0,0,-1), vec4(1,1,1,1));

        //for future debugging

        // console.log("\tModels: ", models);

        console.log("Logic check: ", models[0].getIntersection(new Ray(vec3(-.5,0.5,0.5), vec3(0.5,0.5,0.5))));

    console.log("CREATING VIEWER, VIEWPANEL...");

        //Todo: some fancy logic of determining a good view panel ->  Viewer.createViewPanel()
        let viewer = new Viewer(vec3(0, 0, -10));
        let view = new ViewPanel(
            vec3(-2.5, 2.5, -5), vec3(2.5, 2.5, -5), vec3(-2.5, -2.5, -5),
            pixelBuffer.getHeight(), pixelBuffer.getWidth()
        );

        //for future debugging
        // console.log(view.getCenter(250,250));
        // console.log(viewer.getLocation());

        // console.log("\tViewer: ", viewer);
        // console.log("\tViewPanel: ", view);

        // let test = new ViewPanel(
        //     vec3(0, 1, 0), vec3(1, 1, 0), vec3(0, 0, 0),
        //     10,10
        // );
        // console.log(test.getCenter(9,9));
        // console.log(view.getCenter(249,249));


    console.log("CREATING CLIPPING CUBE...");

        let cc = new ClippingCube(-12, -10, -4.5, 30);
        // console.log(cc);

        //Debugging
        // let testRay = new Ray(vec3(-1,-1,-1), vec3(-0.5,-0.5,-0.5));
        // console.log(testRay);
        // let testCC = new ClippingCube(0,0,0,2);
        // console.log(testCC);
        // console.log(testCC.getRayInCube(testRay));

        // Tests Triangle
        // let testTriangle = new Triangle([vec3(0,0,0),vec3(1,0,0),vec3(0.5,1,0)],vec4(0,0,1,1));
        // let testRay = new Ray(vec3(0.5,1,-0.5), vec3(0.5,1, 0.5));
        // console.log("Test 1: ", testTriangle.getIntersectionT(testRay));
        // testRay = new Ray(vec3(0.5,1.01,-0.5), vec3(0.5,1.01, 0.5));
        // console.log("Test 1: ", testTriangle.getIntersectionT(testRay));
        // testRay = new Ray(vec3(0.501,1,-0.5), vec3(0.501,1, 0.5));
        // console.log("Test 1: ", testTriangle.getIntersectionT(testRay));


        // let testModel = new Model([new Triangle([vec3(0,0,0),vec3(1,0,0),vec3(0.5,1,0)],vec4(0,0,1,1))]);
        // let testRay = new Ray(vec3(0.5,1,-0.5), vec3(0.5,1, 0.5));
        // console.log("Test 1: ", testModel.getIntersection(testRay));
        // testRay = new Ray(vec3(0.5,1.01,-0.5), vec3(0.5,1.01, 0.5));
        // console.log("Test 1: ", testModel.getIntersection(testRay));
        // testRay = new Ray(vec3(0.501,1,-0.5), vec3(0.501,1, 0.5));
        // console.log("Test 1: ", testModel.getIntersection(testRay));
        // testRay = new Ray(vec3(0.499,1,-0.5), vec3(0.499,1, 0.5));
        // console.log("Test 1: ", testModel.getIntersection(testRay));
        // testRay = new Ray(vec3(0,0,-0.5), vec3(0,0, 0.5));
        // console.log("Test 2: ", testModel.getIntersection(testRay));
        // testRay = new Ray(vec3(0.5,0,-0.5), vec3(0.5,0, 0.5));
        // console.log("Test 3: ", testModel.getIntersection(testRay));

    console.log("GET RAYS");

        // console.log("orig ray 1 1", viewer.getLocation(), view.getCenter(1, 1))
        // console.log("orig ray 3 10" , viewer.getLocation(), view.getCenter(3, 10))
        //Todo: rendering
        let count = 0;
        for (let x = 0; x < pixelBuffer.getWidth(); x++)
            for (let y = 0; y < pixelBuffer.getHeight(); y++) {
                let ray = cc.getRayInCube(
                    new Ray(viewer.getLocation(), view.getCenter(x, y))
                );
                if (ray === false) continue;
                // console.log(JSON.stringify(ray));
                let intersect, min = false;
                for (let i = 0; i < models.length; i++ ) {
                    intersect = models[i].getIntersection(ray);
                    if (min === false && intersect !== false)
                        min = intersect;
                    else if (intersect !== false) {
                        if (intersect.t < min.t)
                            min = intersect;
                    }
                }
                if (min !== false) {
                    let position = ray.getPointAtT(min.t);
                    let lightRay = new Ray(ray.getPointAtT(min.t), lightSource.position);
                    let isShadow = false;
                    for (let i = 0; i < models.length && !isShadow; i++ ) {
                        intersect = models[i].getIntersection(lightRay);
                        if (intersect !== false && intersect.t > EPSILON){
                            isShadow = true;
                        }
                    }

                    let L = normalize( sub(lightSource.position, position) );
                    let N = normalize( min.triangle.normal );
                    let R = normalize( sub(scale(dot(L, N), scale(2 , N)), L) );
                    let V = normalize( sub(viewer.location, position));

                    let ambient = scale(min.ambientConstant, ambientIntensity);
                    if(!isShadow){
                        let distance = sub(lightRay.endPoint, lightRay.startPoint);
                        distance = Math.sqrt(Math.pow(distance[0],2) + Math.pow(distance[1],2) + Math.pow(distance[2],2));
                        let distanceCoefficient = 1 / (a + (b * distance) + (c * Math.pow(distance, 2)));

                        let diffuse = scale(min.diffusionConstant * distanceCoefficient * Math.max(-dot(L, N), 0.0), lightSource.intensity);

                        let specular = scale(min.specularConstant * distanceCoefficient * Math.max(Math.pow(dot(R,V), min.shininess), 0.0), lightSource.intensity);

                        if(count < 5){
                            // console.log(ambient);
                            // console.log(diffuse);
                            // console.log(dot(L,N));
                            // console.log(specular);
                            count++;
                        }

                        let lighting = add(add(ambient, diffuse), specular);
                        lighting[3] = 1;

                        if(count < 40){
                            // console.log(ambient);
                            // console.log(diffuse);
                            // console.log(dot(L,N));
                            // console.log(specular);
                            console.log(lighting);
                            count++;
                        }

                        pixelBuffer.setColor(x, y, mult(min.triangle.color, lighting));
                    } else {
                        ambient[3] = 1;
                        pixelBuffer.setColor(x, y, mult(min.triangle.color, ambient));
                    }
                }
            }

    // Draw buffer

    console.log("PIXELBUFFER DRAWING...");
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
    console.log("Rendering pixels")
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
