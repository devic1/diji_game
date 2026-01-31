class Game {
  constructor() {
    this.level = parseInt(localStorage.getItem('diji_level')) || 1;
    this.graph = new Graph();
    this.svg = document.getElementById("game-svg");
    this.userPath = [];
    this.botPath = [];
    this.sourceNode = null;
    this.targetNode = null;
    this.gameState = "IDLE"; 

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadLevel();
  }

  setupEventListeners() {
    document.getElementById("reset-btn").addEventListener("click", () => this.resetSelection());
    document.getElementById("run-btn").addEventListener("click", () => this.runComparison());
    document.getElementById("next-level-btn").addEventListener("click", () => this.nextLevel());
    document.getElementById("retry-btn").addEventListener("click", () => this.loadLevel());
    document.getElementById("full-reset-btn").addEventListener("click", () => this.fullReset());
  }

  loadLevel() {
    this.gameState = "IDLE";
    
    // Check if a saved graph for this level exists
    const savedGraph = localStorage.getItem('diji_saved_graph');
    if (savedGraph) {
        const data = JSON.parse(savedGraph);
        if (data.level === this.level) {
            this.rebuildFromData(data);
        } else {
            this.generateLevelGraph();
        }
    } else {
        this.generateLevelGraph();
    }
    
    this.userPath = [this.sourceNode];
    this.render();
    this.updateUI();
    this.highlightPath();

    document.getElementById("result-modal").classList.add("hidden");
    document.getElementById("run-btn").disabled = true;
    
    localStorage.setItem('diji_level', this.level);
  }

  rebuildFromData(data) {
      this.graph.clear();
      data.nodes.forEach(n => this.graph.addNode(n.id, n.x, n.y, n.label));
      data.edges.forEach(e => this.graph.addEdge(e.from, e.to, e.weight));
      this.sourceNode = data.source;
      this.targetNode = data.target;
      this.optimalDistance = data.optimalDistance;
      this.botPath = data.botPath;
  }

  fullReset() {
      if (confirm("Reset game to Level 1 and generate new layout?")) {
          this.level = 1;
          localStorage.removeItem('diji_level');
          localStorage.removeItem('diji_saved_graph');
          this.loadLevel();
      }
  }

  generateLevelGraph() {
    this.graph.clear();
    const nodeCount = Math.min(26, 3 + Math.floor(this.level * 1.5));
    const padding = 100;
    const width = 800;
    const height = 600;

    const cols = Math.ceil(Math.sqrt(nodeCount * (width / height)));
    const rows = Math.ceil(nodeCount / cols);
    const cellW = (width - 2 * padding) / cols;
    const cellH = (height - 2 * padding) / rows;

    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (positions.length < nodeCount) {
          const x = padding + c * cellW + cellW / 2 + (Math.random() - 0.5) * (cellW * 0.5);
          const y = padding + r * cellH + cellH / 2 + (Math.random() - 0.5) * (cellH * 0.5);
          positions.push({ x, y });
        }
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < nodeCount; i++) {
      this.graph.addNode(i, positions[i].x, positions[i].y, String.fromCharCode(65 + i));
    }

    this.sourceNode = 0;
    this.targetNode = nodeCount - 1;

    // Sparser connections to reduce congestion
    for (let i = 0; i < nodeCount; i++) {
        const neighbors = this.graph.nodes
            .filter(n => n.id !== i)
            .map(n => ({ id: n.id, dist: this.calculateDistance(this.graph.nodes[i], n) }))
            .sort((a, b) => a.dist - b.dist);
        
        // Connect to 2 closest nodes only
        neighbors.slice(0, 2).forEach(nb => {
            if (this.level > 1 && ((i === this.sourceNode && nb.id === this.targetNode) || (i === this.targetNode && nb.id === this.sourceNode))) {
                return;
            }
            const weight = Math.round(nb.dist / 20) + Math.floor(Math.random() * 5) + 1;
            this.graph.addEdge(i, nb.id, weight);
        });
    }

    const solution = this.graph.dijkstra(this.sourceNode, this.targetNode);
    this.optimalDistance = solution.distance;
    this.botPath = solution.path;

    const minNodes = Math.min(nodeCount - 1, 2 + Math.floor(this.level / 4));
    if (this.botPath.length < minNodes || this.optimalDistance === Infinity) {
        this.generateLevelGraph();
        return;
    }

    // Save graph data
    const graphData = {
        level: this.level,
        nodes: this.graph.nodes,
        edges: this.graph.edges,
        source: this.sourceNode,
        target: this.targetNode,
        optimalDistance: this.optimalDistance,
        botPath: this.botPath
    };
    localStorage.setItem('diji_saved_graph', JSON.stringify(graphData));
  }

  calculateDistance(n1, n2) {
    return Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
  }

  render() {
    this.svg.innerHTML = "";

    // Render edges
    this.graph.edges.forEach((edge) => {
      const n1 = this.graph.nodes[edge.from];
      const n2 = this.graph.nodes[edge.to];
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", n1.x); line.setAttribute("y1", n1.y);
      line.setAttribute("x2", n2.x); line.setAttribute("y2", n2.y);
      line.setAttribute("class", "edge");
      line.setAttribute("id", `edge-${edge.from}-${edge.to}`);
      this.svg.appendChild(line);

      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", midX); t.setAttribute("y", midY - 5);
      t.setAttribute("class", "edge-label");
      t.setAttribute("text-anchor", "middle");
      t.textContent = edge.weight;
      this.svg.appendChild(t);
    });

    // Render nodes as circles for cleaner look
    this.graph.nodes.forEach((node) => {
      const isSrc = node.id === this.sourceNode;
      const isTarget = node.id === this.targetNode;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(${node.x}, ${node.y})`);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", 15);
      circle.setAttribute("class", `node ${isSrc ? "source" : ""} ${isTarget ? "target" : ""}`);
      circle.setAttribute("id", `node-${node.id}`);
      circle.addEventListener("click", () => this.handleNodeClick(node.id));

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "node-text");
      if (isSrc) text.textContent = "S";
      else if (isTarget) text.textContent = "G";
      else text.textContent = node.label;

      g.appendChild(circle);
      g.appendChild(text);
      this.svg.appendChild(g);
    });

    // Markers: Just O and X
    this.userMarker = this.createMarker("user-marker", "O");
    this.botMarker = this.createMarker("bot-marker", "X");
    this.svg.appendChild(this.userMarker);
    this.svg.appendChild(this.botMarker);
    this.hideMarkers();
  }

  createMarker(className, char) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", `marker ${className}`);
    g.style.opacity = "0";
    
    // User is a solid circle with O
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", 12);
    
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = char;
    
    g.appendChild(circle);
    g.appendChild(text);
    return g;
  }

  hideMarkers() {
    this.userMarker.style.opacity = "0";
    this.botMarker.style.opacity = "0";
  }

  handleNodeClick(nodeId) {
    if (this.gameState === "RUNNING" || this.gameState === "FINISHED") return;
    const lastNode = this.userPath[this.userPath.length - 1];
    if (nodeId === lastNode && this.userPath.length > 1) {
        this.userPath.pop();
    } else {
        const connection = this.graph.adjacencyList[lastNode].find((e) => e.node === nodeId);
        if (connection && !this.userPath.includes(nodeId)) {
          this.userPath.push(nodeId);
        }
    }
    this.updateUI();
    this.highlightPath();
  }

  resetSelection() {
    if (this.gameState === "RUNNING") return;
    this.userPath = [this.sourceNode];
    this.updateUI();
    this.highlightPath();
  }

  highlightPath() {
    document.querySelectorAll(".edge").forEach((e) => e.classList.remove("active"));
    document.querySelectorAll(".node").forEach((n) => n.classList.remove("selected"));
    for (let i = 0; i < this.userPath.length; i++) {
        const nodeId = this.userPath[i];
        document.getElementById(`node-${nodeId}`).classList.add("selected");
        if (i > 0) {
            const p1 = this.userPath[i - 1];
            const p2 = this.userPath[i];
            const edge = document.getElementById(`edge-${p1}-${p2}`) || document.getElementById(`edge-${p2}-${p1}`);
            if (edge) edge.classList.add("active");
        }
    }
  }

  updateUI() {
    document.getElementById("level-num").textContent = this.level;
    document.getElementById("user-dist").textContent = this.getCurrentUserDist();
    document.getElementById("path-display").textContent = this.userPath.map(id => this.graph.nodes[id].label).join(" ");
    const lastNode = this.userPath[this.userPath.length - 1];
    document.getElementById("run-btn").disabled = (lastNode !== this.targetNode) || this.gameState === "RUNNING";
  }

  getCurrentUserDist() {
    let dist = 0;
    for (let i = 1; i < this.userPath.length; i++) {
      const connection = this.graph.adjacencyList[this.userPath[i - 1]].find((e) => e.node === this.userPath[i]);
      if (connection) dist += connection.weight;
    }
    return dist;
  }

  async runComparison() {
    this.gameState = "RUNNING";
    document.getElementById("run-btn").disabled = true;
    this.botMarker.style.opacity = "1";
    this.userMarker.style.opacity = "1";

    const userDistance = this.getCurrentUserDist();
    const botDistance = this.optimalDistance;

    // Invert speed logic: smaller value on slider = slower, so 330 - current
    const speed = 330 - parseInt(document.getElementById("speed-slider").value);
    
    await Promise.all([
        this.animatePath(this.userMarker, this.userPath, "user", speed),
        this.animatePath(this.botMarker, this.botPath, "bot", speed)
    ]);
    
    await new Promise((r) => setTimeout(r, 600));
    this.gameState = "FINISHED";
    this.showResult(userDistance, botDistance);
  }

  async animatePath(marker, path, type, speed) {
    for (let i = 0; i < path.length; i++) {
      const node = this.graph.nodes[path[i]];
      if (i === 0) {
        await this.applyMovement(marker, node.x, node.y, 300);
      }
      if (i < path.length - 1) {
        const nextNode = this.graph.nodes[path[i + 1]];
        const connection = this.graph.adjacencyList[path[i]].find((e) => e.node === path[i + 1]);
        const duration = (connection ? connection.weight : 1) * speed;
        if (type === "bot") {
          const edgeEl = document.getElementById(`edge-${path[i]}-${path[i+1]}`) || document.getElementById(`edge-${path[i+1]}-${path[i]}`);
          if (edgeEl) edgeEl.classList.add("bot-path");
        }
        await this.applyMovement(marker, nextNode.x, nextNode.y, duration);
      }
    }
  }

  applyMovement(marker, x, y, duration) {
    return new Promise((resolve) => {
      marker.style.transition = `transform ${duration}ms linear`;
      marker.setAttribute("transform", `translate(${x}, ${y})`);
      setTimeout(resolve, duration);
    });
  }

  showResult(userDist, botDist) {
    const modal = document.getElementById("result-modal");
    const title = document.getElementById("result-title");
    const text = document.getElementById("result-text");
    modal.classList.remove("hidden");
    
    if (userDist === botDist) {
      title.textContent = "VICTORY";
      text.textContent = `PERFECT! YOU FOUND THE OPTIMAL PATH OF ${userDist}.`;
      this.celebrate();
    } else {
      title.textContent = "DEFEAT";
      text.textContent = `BETTER LUCK NEXT TIME! BOT: ${botDist} | YOU: ${userDist}.`;
    }
  }

  celebrate() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const confetti = [];
    for(let i=0; i<150; i++) {
        confetti.push({
            x: Math.random()*canvas.width,
            y: Math.random()*canvas.height - canvas.height,
            r: Math.random()*6 + 2,
            d: Math.random()*10,
            color: `hsl(${Math.random()*360}, 70%, 50%)`,
            tilt: Math.random()*10 - 10
        });
    }
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confetti.forEach((c, i) => {
            c.y += Math.cos(c.d) + 1 + c.r/2;
            c.tilt += 0.1;
            ctx.beginPath();
            ctx.lineWidth = c.r;
            ctx.strokeStyle = c.color;
            ctx.moveTo(c.x + c.tilt + c.r/2, i % 2 === 0 ? c.y : c.y + c.r);
            ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r/2);
            ctx.stroke();
            if (c.y > canvas.height) {
                confetti[i] = { x: Math.random()*canvas.width, y: -20, r: c.r, d: c.d, color: c.color, tilt: c.tilt };
            }
        });
        requestAnimationFrame(draw);
    };
    draw();
    setTimeout(() => canvas.remove(), 4000);
  }

  nextLevel() {
    localStorage.removeItem('diji_saved_graph'); // Clear to generate new for next level
    this.level++;
    this.loadLevel();
  }
}

window.onload = () => new Game();
