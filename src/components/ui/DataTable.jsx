export default function DataTable({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="table-header">
            {columns.map((column, index) => (
              <th 
                key={index} 
                className="px-6 py-4 text-left first:rounded-tl-xl last:rounded-tr-xl"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              className={`
                transition-colors hover:bg-muted/50
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  {column.cell ? column.cell(row) : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          Không có dữ liệu
        </div>
      )}
    </div>
  );
}
