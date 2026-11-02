import { Modal } from './Modal';

export function HelpModal({ open, onClose }: { open: boolean; onClose(): void }) {
  return <Modal open={open} title="A few lines. Plenty to think about." onClose={onClose}>
    <div className="modal-body help-body"><p>Two players take turns adding a straight line. Every cut creates new rooms.</p>
      <ol className="rules-list"><li><strong>Pick two grid points.</strong> The line through them extends across the board. Or select a direction and tap one point.</li><li><strong>Read the preview.</strong> The dashed line shows the cut, the room increase, and whether it reaches the target. An invalid line is red and does not use your turn.</li><li><strong>Play the selected rule.</strong> In Avoidance, reaching or exceeding M loses. In Race, reaching or exceeding M wins.</li></ol>
      <h3>Explore the variations</h3><p><strong>Board:</strong> count rooms inside the original square, just like the original game. Boundary lines are not allowed.</p><p><strong>Whole plane:</strong> count all rooms, including those outside the square and those that continue forever. The view automatically expands to include all intersections. Boundary lines are allowed here. “Board” zooms back in for precise input; the score stays the same.</p><p><strong>Triple points:</strong> allow three or more lines to meet at one point, or forbid this everywhere, even off-board.</p><p><strong>Capacity:</strong> limit the total lines in each direction across both players. Exhausting every capacity below the target is a draw, in either winning rule.</p><p className="note-box">Choose your drawing points from the grid inside the original square, even in whole-plane mode. If no allowed cut remains before the target is reached, the game is a draw.</p>
      <h3>Keyboard & touch</h3><p>Focus the board with Tab. Use arrow keys to move, Enter or Space to select, and Escape to cancel. On a touchscreen, tap once for each point. Direction buttons make one-tap cuts possible.</p>
      <p>The computer follows the same rules and can play either side. It is a practice opponent and can make mistakes. Opening this menu pauses computer play.</p>
    </div><footer className="modal-footer"><button className="primary" onClick={onClose}>Let’s play</button></footer>
  </Modal>;
}
