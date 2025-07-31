import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataTable, DataTableColumn } from '../DataTable';

describe('DataTable', () => {
  const mockData = [
    { id: 1, name: 'Item 1', value: 100 },
    { id: 2, name: 'Item 2', value: 200 },
    { id: 3, name: 'Item 3', value: 300 },
  ];

  const mockColumns: DataTableColumn<typeof mockData[0]>[] = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'value', label: 'Value', align: 'right' },
  ];

  it('should render table with data', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyField="id"
      />
    );

    // Header
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    // Data
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should apply custom row styles', () => {
    const getRowStyles = (row: typeof mockData[0]) => ({
      backgroundColor: row.id === 1 ? 'red' : 'transparent',
    });

    const { container } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyField="id"
        getRowStyles={getRowStyles}
      />
    );

    const firstRow = container.querySelector('tbody tr:first-child');
    expect(firstRow).toHaveStyle({ backgroundColor: 'red' });
  });

  it('should apply custom row class names', () => {
    const getRowClassName = (row: typeof mockData[0]) => 
      row.id === 2 ? 'special-row' : '';

    const { container } = render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        keyField="id"
        getRowClassName={getRowClassName}
      />
    );

    const secondRow = container.querySelector('tbody tr:nth-child(2)');
    expect(secondRow).toHaveClass('special-row');
  });

  it('should handle empty data', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        keyField="id"
        emptyMessage="No data found"
      />
    );

    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        keyField="id"
        loading={true}
      />
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should format cell values when format function is provided', () => {
    const columnsWithFormat: DataTableColumn<typeof mockData[0]>[] = [
      ...mockColumns,
      {
        id: 'value',
        label: 'Formatted Value',
        format: (value) => `¥${value}`,
      },
    ];

    render(
      <DataTable
        columns={columnsWithFormat}
        data={mockData}
        keyField="id"
      />
    );

    expect(screen.getByText('¥100')).toBeInTheDocument();
  });
});