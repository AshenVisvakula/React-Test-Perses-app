import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
} from "@mui/material";
import { useDataQueries } from "@perses-dev/plugin-system";

const CustomLogsTable = () => {
  const { data, isLoading, error } = useDataQueries();
  console.log(data)

  if (isLoading) return <div>Loading logs...</div>;
  if (error) return <div>Error loading logs</div>;

  const frames = data?.[0]?.data?.frames ?? [];

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Time</TableCell>
          <TableCell>Message</TableCell>
          <TableCell>Labels</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {frames.flatMap((frame: any) =>
          frame.data.values[0].map((_: any, i: number) => {
            const time = frame.data.values[0][i];
            const message = frame.data.values[1][i];
            const labels = frame.schema?.fields?.[1]?.labels ?? {};

            return (
              <TableRow key={i}>
                <TableCell>
                  {new Date(time).toLocaleString()}
                </TableCell>

                <TableCell>
                  <Typography
                    sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                  >
                    {message}
                  </Typography>
                </TableCell>

                <TableCell>
                  <pre>{JSON.stringify(labels, null, 2)}</pre>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default CustomLogsTable;
