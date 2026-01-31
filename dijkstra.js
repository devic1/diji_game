class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(element, priority) {
    const node = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (node.priority < this.items[i].priority) {
        this.items.splice(i, 0, node);
        added = true;
        break;
      }
    }
    if (!added) this.items.push(node);
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

class Graph {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.adjacencyList = {};
  }

  addNode(id, x, y, label) {
    this.nodes.push({ id, x, y, label });
    this.adjacencyList[id] = [];
  }

  addEdge(from, to, weight) {
    // Check if edge already exists
    if (this.adjacencyList[from].some(e => e.node === to)) return;
    
    this.edges.push({ from, to, weight });
    this.adjacencyList[from].push({ node: to, weight });
    this.adjacencyList[to].push({ node: from, weight }); // Undirected
  }

  clear() {
    this.nodes = [];
    this.edges = [];
    this.adjacencyList = {};
  }

  dijkstra(startNodeId, endNodeId) {
    const distances = {};
    const previous = {};
    const pq = new PriorityQueue();

    this.nodes.forEach((node) => {
      distances[node.id] = Infinity;
      previous[node.id] = null;
    });

    distances[startNodeId] = 0;
    pq.enqueue(startNodeId, 0);

    while (!pq.isEmpty()) {
      const { element: currentNodeId } = pq.dequeue();

      if (currentNodeId === endNodeId) break;

      this.adjacencyList[currentNodeId].forEach((neighbor) => {
        const alt = distances[currentNodeId] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = currentNodeId;
          pq.enqueue(neighbor.node, alt);
        }
      });
    }

    const path = [];
    let curr = endNodeId;
    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return {
      distance: distances[endNodeId],
      path: path[0] === startNodeId ? path : [],
    };
  }
}

// Export for usage if using modules, but here we'll use global scope for simplicity in a 3-file setup
window.Graph = Graph;
window.PriorityQueue = PriorityQueue;
