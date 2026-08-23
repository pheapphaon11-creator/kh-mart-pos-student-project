export function SkeletonPage() {
  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ width: 250, height: 32, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 350, height: 16, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 120, height: 40, borderRadius: 8 }} />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      
      <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}

export function SkeletonTable({ columns = 5, rows = 5 }: { columns?: number, rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i}>
          {[...Array(columns)].map((_, j) => (
            <td key={j} style={{ padding: '16px' }}>
              <div className="skeleton" style={{ height: 20, width: j === 0 ? '60%' : j === columns - 1 ? '30%' : '100%', borderRadius: 4 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
