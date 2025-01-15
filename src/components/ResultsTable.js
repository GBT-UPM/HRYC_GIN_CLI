import React, { useMemo, useState } from 'react';
import { useTable, useSortBy } from 'react-table';
import ReactPaginate from 'react-paginate';
import PropTypes from 'prop-types';
import './ResultsTable.css'; // Asegúrate de crear un archivo CSS para estilos personalizados

const ResultsTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const columns = useMemo(
    () => [
      {
        Header: 'ID',
        accessor: 'id',
      },
      {
        Header: 'Pregunta',
        accessor: 'question',
      },
      {
        Header: 'Respuesta',
        accessor: 'answer',
      },
    ],
    []
  );

  const formattedData = useMemo(
    () =>
      data.flatMap((entry) =>
        entry.resourceData.item.map((item) => ({
          id: entry.id,
          question: item.text,
          answer: item.answer[0].valueCoding
            ? item.answer[0].valueCoding.display
            : item.answer[0].valueDate
            ? item.answer[0].valueDate
            : item.answer[0].valueDecimal
            ? item.answer[0].valueDecimal
            : item.answer[0].valueInteger
            ? item.answer[0].valueInteger
            : '',
        }))
      ),
    [data]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
  } = useTable(
    {
      columns,
      data: formattedData.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
      ),
    },
    useSortBy
  );

  const pageCount = Math.ceil(formattedData.length / itemsPerPage);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  return (
    <div>
      <table {...getTableProps()} className="table">
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <ReactPaginate
        previousLabel={'Anterior'}
        nextLabel={'Siguiente'}
        breakLabel={'...'}
        pageCount={pageCount}
        marginPagesDisplayed={2}
        pageRangeDisplayed={5}
        onPageChange={handlePageClick}
        containerClassName={'pagination'}
        activeClassName={'active'}
      />
    </div>
  );
};

ResultsTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      resourceData: PropTypes.shape({
        item: PropTypes.arrayOf(
          PropTypes.shape({
            text: PropTypes.string.isRequired,
            answer: PropTypes.arrayOf(
              PropTypes.shape({
                valueCoding: PropTypes.shape({
                  code: PropTypes.string,
                  display: PropTypes.string,
                }),
                valueDate: PropTypes.string,
                valueDecimal: PropTypes.number,
                valueInteger: PropTypes.number,
              })
            ).isRequired,
            linkId: PropTypes.string.isRequired,
          })
        ).isRequired,
        status: PropTypes.string.isRequired,
        resourceType: PropTypes.string.isRequired,
      }).isRequired,
    })
  ).isRequired,
};

export default ResultsTable;