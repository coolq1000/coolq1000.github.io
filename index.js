
class Engine
{
    constructor(obj, settings)
    {
        /* Initialization, */

        // Default settings,
        this.FPS = 60;
        this.FOVMul = 1;
        this.obj = obj;
        this.resScale = 1;

        // Update defaults with new settings,
        this.settings = settings
        if ('FPS' in settings) this.FPS = this.settings['FPS'];
        if ('FOV' in settings) this.FOVMul = this.settings['FOV'];
        if ('resScale' in settings) this.resScale = this.settings['resScale'];

        // Setup,
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Screen,
        this.updateScreen();

        // Start,
        this.last = Date.now();
        this.rotation = [0, 0];
        this.velocity = [0, 0];
        this.lastMouse = undefined;
        this.reset = true;
        this.zoom = 5;
        this.forwardVel = 0;
        this.canvas.addEventListener('mousemove', this.mouseEvent.bind(this))

        var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel" //FF doesn't recognize mousewheel as of FF3.x

        if (document.attachEvent) //if IE (and Opera depending on user setting)
            document.attachEvent("on"+mousewheelevt, this.scrollEvent.bind(this))
        else if (document.addEventListener) //WC3 browsers
            document.addEventListener(mousewheelevt, this.scrollEvent.bind(this), false)

        window.addEventListener('keydown', this.keyboardEvent.bind(this));
        this.canvas.oncontextmenu = function(e) {return false;}
        setInterval(this.update.bind(this), 1000 / this.FPS);
    }

    keyboardEvent(evt)
    {
        if (evt.key == ' ')
        {
            this.zoom = 5;
            this.velocity = [0, 0];
            this.forwardVel = 0;
            this.rotation = [0, 0];
        }
    }

    scrollEvent(evt)
    {
        if (!evt.detail)
        {
            this.forwardVel -= evt.wheelDelta / 500;
        } else
        {
            this.forwardVel += evt.detail / 10;
        }
    }

    mouseEvent(evt)
    {
        let pos = [evt.clientX, evt.clientY];
        if (this.lastMouse == undefined) this.lastMouse = pos;
        let rel = [pos[0] - this.lastMouse[0], pos[1] - this.lastMouse[1]];
        this.lastMouse = pos;
        if (evt.buttons)
        {
            if (this.reset)
            {
                this.velocity = [0, 0];
                this.reset = false;
            }
            this.velocity[0] += rel[0] / 5000;
            this.velocity[1] += rel[1] / 5000;
        } else{
            this.reset = true;
        }
    }

    updateScreen()
    {
        this.canvas.width = window.innerWidth * this.resScale;
        this.canvas.height = window.innerHeight * this.resScale;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.cx = this.width / 2;
        this.cy = this.height / 2;
        this.FOV = Math.min(this.width, this.height) * this.FOVMul;
    }

    rotate2d(pos, rad)
    {
        let [x, y] = pos;
        let [s, c] = [Math.sin(rad), Math.cos(rad)];
        return [x * c - y * s, x * s + y * c];
    }

    rotate3d(pos, rot)
    {
        let [x, y, z] = pos;
        let [rx, ry] = rot;
        [x, z] = this.rotate2d([x, z], rx);
        [y, z] = this.rotate2d([y, z], ry);
        return [x, y, z];
    }

    project(x, y, z)
    {
        [x, y, z] = this.rotate3d([x, y, z], this.rotation);
        z += this.zoom;
        let f = this.FOV / z;
        x *= f; y *= f;
        return [x + this.cx, y + this.cy, z];
    }

    sortTris(tri1, tri2)
    {
        let depth1 = [];
        for (var i_vert = 0; i_vert < tri1.length; i_vert++)
        {
            let [vx, vy, vz] = this.obj['verts'][tri1[i_vert]];
            depth1.push(this.project(vx, vy, vz)[2]);
        }
        let depth2 = [];
        for (var i_vert = 0; i_vert < tri2.length; i_vert++)
        {
            let [vx, vy, vz] = this.obj['verts'][tri2[i_vert]];
            depth2.push(this.project(vx, vy, vz)[2]);
        }
        depth1 = depth1.reduce(function(a, b) {return a + b;})
        depth2 = depth2.reduce(function(a, b) {return a + b;})
        return depth1 < depth2;
    }

    draw()
    {
        this.obj['tris'].sort(this.sortTris.bind(this));
        for (var i_tri = 0; i_tri < this.obj['tris'].length; i_tri++)
        {
            let points = [];
            for (var i_vert = 0; i_vert < this.obj['verts'].length; i_vert++)
            {
                let [vx1, vy1, vz1] = this.obj['verts'][this.obj['tris'][i_tri][0]];
                let [vx2, vy2, vz2] = this.obj['verts'][this.obj['tris'][i_tri][1]];
                let [vx3, vy3, vz3] = this.obj['verts'][this.obj['tris'][i_tri][2]];
                let [x1, y1, z1] = this.project(vx1, vy1, vz1);
                let [x2, y2, z2] = this.project(vx2, vy2, vz2);
                let [x3, y3, z3] = this.project(vx3, vy3, vz3);
                points.push([x1, y1]);
                points.push([x2, y2]);
                points.push([x3, y3]);
            }
            this.ctx.beginPath();
            this.ctx.fillStyle = '#222';
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 1;
            for (var i_point = 0; i_point < points.length; i_point++)
            {
                this.ctx.lineTo(points[i_point][0], points[i_point][1]);
            }
            this.ctx.stroke();
            this.ctx.fill();
            this.ctx.closePath();
        }
    }

    update()
    {
        let delta = Date.now() - this.last;
        this.updateScreen();
        this.rotation[0] += this.velocity[0] * delta / 5;
        this.velocity[0] /= 1 + (delta / 100);
        this.rotation[1] += this.velocity[1] * delta / 5;
        this.velocity[1] /= 1 + (delta / 100);
        this.zoom += this.forwardVel;
        this.forwardVel /= 1 + (delta / 50);
        this.zoom = Math.min(Math.max(this.zoom, 3), 25);
        this.rotation[1] = Math.max(Math.min(this.rotation[1], Math.PI / 2), -Math.PI / 2)
        this.draw();
        this.last = Date.now();
    }
}

let obj = {
    'verts': [
        [-1, -1, -1],
        [ 1, -1, -1],
        [ 1,  1, -1],
        [-1,  1, -1],
        [-1, -1,  1],
        [ 1, -1,  1],
        [ 1,  1,  1],
        [-1,  1,  1]
    ],
    'tris': [
        [0, 1, 2], [2, 3, 0], // Front
        [4, 5, 6], [6, 7, 4], // Back
        [2, 6, 7], [7, 3, 2], // Bottom
        [0, 4, 5], [5, 1, 0], // Top
        [0, 4, 7], [7, 3, 0], // Left
        [1, 5, 6], [6, 2, 1]  //Right
    ]
}

let engine = new Engine(obj, {'FPS': 60, 'FOV': 0.8, 'resScale': 1});
