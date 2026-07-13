import { cn } from '../../utils';

/**
 * Surface container (roadmap 3.2). Border-over-shadow per DESIGN_DIRECTION — resting
 * cards get a hairline border, not elevation. Under a `.jvd` root.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export default function Card({ padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface',
        padded && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
