import { Outlet } from 'react-router-dom';
import { SALES_ACTIONS_ENABLED } from '../../constants/salesActions';

/** Silently pauses Sales actions, including events from portaled modals. */
export default function SalesActionsGate() {
  if (SALES_ACTIONS_ENABLED) return <Outlet />;

  return (
    <section className="min-w-0">
      <div
        onClickCapture={event => { event.preventDefault(); event.stopPropagation(); }}
        onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }}
        onKeyDownCapture={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <Outlet />
      </div>
    </section>
  );
}
