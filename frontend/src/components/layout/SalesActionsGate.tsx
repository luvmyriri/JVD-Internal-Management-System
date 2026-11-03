import { Outlet } from 'react-router-dom';
import { SALES_ACTIONS_ENABLED } from '../../constants/salesActions';

/** Pauses Sales controls, including events from modals rendered through portals. */
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
        <fieldset disabled aria-label="Sales actions temporarily disabled" className="m-0 min-w-0 border-0 p-0 [&_button]:cursor-not-allowed [&_button]:opacity-50 [&_input]:opacity-60 [&_select]:opacity-60 [&_textarea]:opacity-60">
          <Outlet />
        </fieldset>
      </div>
    </section>
  );
}
