import type { ReactNode } from 'react';

interface HelpModalProps {
  open: boolean;
  onClose(): void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) {
    return null;
  }

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        aria-describedby="help-modal-content"
      >
        <header className="modal-header">
          <h2 id="help-modal-title">How to Play</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close help">
            ×
          </button>
        </header>
        <section id="help-modal-content" className="modal-body">
          <RuleText />
        </section>
        <footer className="modal-footer">
          <button type="button" className="primary" onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

function RuleText(): ReactNode {
  return (
    <>
      <p>
        Two players take turns drawing maximal straight lines on a lattice board. Lines must use one
        of the admissible direction vectors shown in the controls and pass through lattice points.
      </p>
      <ol className="rules-list">
        <li>Select a lattice point to mark your starting anchor.</li>
        <li>Select a second lattice point that determines a valid direction.</li>
        <li>
          The line automatically extends across the entire board in that direction until it hits the
          boundary.
        </li>
        <li>Duplicate lines or lines coincident with the border are illegal and ignored.</li>
      </ol>
      <p>
        Each line increases the number of rooms (connected open regions). If your move pushes the
        room count to or beyond the target room count <code>M</code>, you immediately lose.
      </p>
      <p>
        Use the admissible direction presets or custom direction list to change the allowable slopes,
        and adjust the target room count to vary difficulty.
      </p>
    </>
  );
}
