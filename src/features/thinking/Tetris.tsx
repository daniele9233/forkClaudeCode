import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Auto-playing Tetris — shown in the left sidebar while the agent is working,
 * so waiting feels like an arcade loading screen. The AI player picks each
 * drop with a classic heuristic (lines cleared, height, holes, bumpiness).
 * Restored from the old Retro OS skin on user request; now themed for the
 * classic UI.
 */
const COLS = 10;
const ROWS = 20;

const CELL_COLORS = [
  "transparent",
  "#dcfdff", // I — cyan
  "#ffabf3", // O — magenta
  "#ff00ff", // T — fuchsia
  "#2ae500", // S — terminal green
  "#ffb4ab", // Z — error red
  "#00f1fd", // J — bright cyan
  "#a4899d", // L — outline
];

const SHAPES = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

function getHeights(grid: number[][]): number[] {
  const heights = Array(COLS).fill(0);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] !== 0) {
        heights[c] = ROWS - r;
        break;
      }
    }
  }
  return heights;
}

function getHoles(grid: number[][], heights: number[]): number {
  let holes = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - heights[c]; r < ROWS; r++) {
      if (grid[r][c] === 0) holes++;
    }
  }
  return holes;
}

function getBumpiness(heights: number[]): number {
  let bumpiness = 0;
  for (let c = 0; c < COLS - 1; c++) {
    bumpiness += Math.abs(heights[c] - heights[c + 1]);
  }
  return bumpiness;
}

function calculateBestMove(pieceShape: number[][], currentGrid: number[][]) {
  let bestScore = -Infinity;
  let bestMove = { x: 0, rotation: 0 };

  let currentShape = pieceShape;
  for (let rotation = 0; rotation < 4; rotation++) {
    if (rotation > 0) {
      currentShape = currentShape[0].map((_, i) =>
        currentShape.map((row) => row[i]).reverse(),
      );
    }

    for (let x = -3; x < COLS + 3; x++) {
      let outOfBounds = false;
      for (let r = 0; r < currentShape.length; r++) {
        for (let c = 0; c < currentShape[r].length; c++) {
          if (currentShape[r][c] !== 0 && (x + c < 0 || x + c >= COLS)) {
            outOfBounds = true;
          }
        }
      }
      if (outOfBounds) continue;

      let y = 0;
      let collision = false;
      while (!collision) {
        for (let r = 0; r < currentShape.length; r++) {
          for (let c = 0; c < currentShape[r].length; c++) {
            if (currentShape[r][c] !== 0) {
              const newY = y + r;
              const newX = x + c;
              if (
                newY >= ROWS ||
                newX < 0 ||
                newX >= COLS ||
                (newY >= 0 && currentGrid[newY][newX] !== 0)
              ) {
                collision = true;
              }
            }
          }
        }
        if (!collision) y++;
      }
      y--;

      let valid = true;
      for (let r = 0; r < currentShape.length; r++) {
        for (let c = 0; c < currentShape[r].length; c++) {
          if (currentShape[r][c] !== 0 && y + r < 0) valid = false;
        }
      }
      if (!valid) continue;

      const testGrid = currentGrid.map((row) => [...row]);
      for (let r = 0; r < currentShape.length; r++) {
        for (let c = 0; c < currentShape[r].length; c++) {
          if (currentShape[r][c] !== 0 && y + r >= 0) {
            testGrid[y + r][x + c] = currentShape[r][c];
          }
        }
      }

      let linesCleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (testGrid[r].every((cell) => cell !== 0)) {
          testGrid.splice(r, 1);
          testGrid.unshift(Array(COLS).fill(0));
          linesCleared++;
          r++;
        }
      }

      const heights = getHeights(testGrid);
      const aggHeight = heights.reduce((a, b) => a + b, 0);
      const holes = getHoles(testGrid, heights);
      const bumpiness = getBumpiness(heights);

      const score = linesCleared * 76 - aggHeight * 5 - holes * 35 - bumpiness * 2;
      if (score > bestScore) {
        bestScore = score;
        bestMove = { x, rotation };
      }
    }
  }

  return bestMove;
}

function randomPiece() {
  const typeId = Math.floor(Math.random() * 7) + 1;
  return {
    shape: SHAPES[typeId],
    color: typeId,
    pos: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[typeId][0].length / 2), y: 0 },
    rotation: 0,
    id: Math.random(),
  };
}

export default function Tetris({ isActive }: { isActive: boolean }) {
  const [grid, setGrid] = useState<number[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const [piece, setPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const frameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const targetMoveRef = useRef({ x: 0, rotation: 0, pieceId: 0 });
  const dropInterval = 80;

  const checkCollision = useCallback(
    (p = piece, g = grid) => {
      for (let y = 0; y < p.shape.length; y++) {
        for (let x = 0; x < p.shape[y].length; x++) {
          if (p.shape[y][x] !== 0) {
            const newY = y + p.pos.y;
            const newX = x + p.pos.x;
            if (
              newY >= ROWS ||
              newX < 0 ||
              newX >= COLS ||
              (newY >= 0 && g[newY][newX] !== 0)
            ) {
              return true;
            }
          }
        }
      }
      return false;
    },
    [piece, grid],
  );

  const mergePiece = useCallback(() => {
    const newGrid = grid.map((row) => [...row]);
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0 && y + piece.pos.y >= 0) {
          newGrid[y + piece.pos.y][x + piece.pos.x] = value;
        }
      });
    });

    let newScore = score;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (newGrid[y].every((cell) => cell !== 0)) {
        newGrid.splice(y, 1);
        newGrid.unshift(Array(COLS).fill(0));
        newScore += 100;
        y++;
      }
    }

    setGrid(newGrid);
    setScore(newScore);
    const nextPiece = randomPiece();
    if (checkCollision(nextPiece, newGrid)) {
      setGameOver(true);
    } else {
      setPiece(nextPiece);
    }
  }, [grid, piece, score, checkCollision]);

  const movePiece = useCallback(
    (dx: number, dy: number) => {
      const nextPos = { x: piece.pos.x + dx, y: piece.pos.y + dy };
      if (!checkCollision({ ...piece, pos: nextPos })) {
        setPiece((prev) => ({ ...prev, pos: nextPos }));
        return true;
      } else if (dy > 0) {
        mergePiece();
      }
      return false;
    },
    [piece, checkCollision, mergePiece],
  );

  const rotatePiece = useCallback(() => {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map((row) => row[i]).reverse(),
    );
    if (!checkCollision({ ...piece, shape: rotated })) {
      setPiece((prev) => ({
        ...prev,
        shape: rotated,
        rotation: (prev.rotation + 1) % 4,
      }));
    } else {
      setPiece((prev) => ({ ...prev, rotation: (prev.rotation + 1) % 4 }));
    }
  }, [piece, checkCollision]);

  const gameLoop = useCallback(
    (time: number) => {
      if (!isActive || gameOver) return;

      if (time - lastTimeRef.current > dropInterval) {
        if (targetMoveRef.current.pieceId !== piece.id) {
          const move = calculateBestMove(piece.shape, grid);
          targetMoveRef.current = { ...move, pieceId: piece.id };
        }

        const target = targetMoveRef.current;
        if (piece.rotation !== target.rotation) {
          rotatePiece();
        } else if (piece.pos.x > target.x) {
          movePiece(-1, 0);
        } else if (piece.pos.x < target.x) {
          movePiece(1, 0);
        } else {
          movePiece(0, 1);
        }

        lastTimeRef.current = time;
      }
      frameRef.current = requestAnimationFrame(gameLoop);
    },
    [isActive, gameOver, movePiece, rotatePiece, piece, grid],
  );

  useEffect(() => {
    if (isActive && !gameOver) {
      frameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isActive, gameOver, gameLoop]);

  if (!isActive) return null;

  const reboot = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setGameOver(false);
    setScore(0);
    setPiece(randomPiece());
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center overflow-hidden border border-[var(--border)] bg-black p-2">
      <div className="mb-2 flex w-full shrink-0 justify-between px-2">
        <span className="hud-label text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          Agent tasking…
        </span>
        <span className="animate-pulse text-[10px] uppercase text-[var(--chat-agent-accent)]">
          Auto-play
        </span>
      </div>

      <div
        className="relative grid min-h-0 w-full flex-1 border border-[var(--border)] bg-black"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            let colorIndex = cell;
            if (
              y >= piece.pos.y &&
              y < piece.pos.y + piece.shape.length &&
              x >= piece.pos.x &&
              x < piece.pos.x + piece.shape[0].length
            ) {
              const pv = piece.shape[y - piece.pos.y][x - piece.pos.x];
              if (pv !== 0) colorIndex = pv;
            }

            return (
              <div
                key={`${x}-${y}`}
                className="h-full w-full"
                style={
                  colorIndex !== 0
                    ? {
                        backgroundColor: CELL_COLORS[colorIndex],
                        boxShadow: "inset 0 0 4px rgba(255,255,255,0.4)",
                        border: "0.5px solid rgba(86,64,82,0.3)",
                      }
                    : undefined
                }
              />
            );
          }),
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <span className="mb-2 p-1 text-center text-[12px] uppercase text-[var(--destructive)]">
              System halted
            </span>
            <button
              onClick={reboot}
              className="border border-[var(--primary)] bg-black px-2 py-1 text-[10px] uppercase text-[var(--primary)]"
            >
              Reboot
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 w-full shrink-0 text-center">
        <div className="text-[10px] font-semibold text-[var(--chat-agent-accent)]">
          SCORE: {score}
        </div>
      </div>
    </div>
  );
}
