import React from "react";
import "./App.css";

import {
  ChartsProvider,
  generateChartsTheme,
  getTheme,
  SnackbarProvider,
} from "@perses-dev/components";
import {
  DataQueriesProvider,
  dynamicImportPluginLoader,
  PluginRegistry,
  TimeRangeProvider,
} from "@perses-dev/plugin-system";
import { ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DatasourceStoreProvider,
  Panel,
  VariableProvider,
} from "@perses-dev/dashboards";
import {
  DashboardResource,
  DurationString,
  GlobalDatasourceResource,
  DatasourceResource,
  TimeRangeValue,
  DatasourceApi,
} from "@perses-dev/core";

import * as lokiPlugin from "@perses-dev/loki-plugin";
import * as timeseriesChartPlugin from "@perses-dev/timeseries-chart-plugin";
//import * as logsTablePlugin from "@perses-dev/logs-table-plugin";
import MissingTokenMessage from "./MissingToken";
//import CustomLogsTable from "./customLogsTable";
import { LogsTable } from "../src/Plugin/LogsTable";

function useIframeParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    logVolume: params.get("logVolume"),
    logQuery: params.get("query"),
    limit: Number(params.get("limit") ?? 200),
    range: (params.get("range") ?? "30m") as DurationString,
    from: params.get("from"),
    to: params.get("to"),
    lokiUrl: params.get("lokiProxyUrl"),
    token: params.get("access_token") ?? undefined,
  };
}

const fakeDatasource = (
  lokiUrl?: string,
  token?: string,
): GlobalDatasourceResource => {
  return {
    kind: "GlobalDatasource",
    metadata: { name: "loki" },
    spec: {
      default: true,
      plugin: {
        kind: "LokiDatasource",
        spec: {
          directUrl: process.env.REACT_APP_LOKI_URL,
          proxy: { spec: { headers: { Authorization: `Bearer ${token}` } } },
        },
      },
    },
  };
};

class DatasourceApiImpl implements DatasourceApi {
  private token?: string;
  private lokiUrl?: string;

  constructor(lokiUrl?: string, token?: string) {
    this.lokiUrl = lokiUrl;
    this.token = token;
  }

  getDatasource(): Promise<DatasourceResource | undefined> {
    return Promise.resolve(undefined);
  }

  getGlobalDatasource(): Promise<GlobalDatasourceResource | undefined> {
    return Promise.resolve(fakeDatasource(this.lokiUrl, this.token));
  }

  listDatasources(): Promise<DatasourceResource[]> {
    return Promise.resolve([]);
  }

  listGlobalDatasources(): Promise<GlobalDatasourceResource[]> {
    return Promise.resolve([fakeDatasource(this.lokiUrl, this.token)]);
  }
}

export const fakeDashboard = {
  kind: "Dashboard",
  metadata: {},
  spec: {},
} as DashboardResource;

const customLogsTablePlugin = {
  getPluginModule: () => ({
    kind: "PluginModule",
    metadata: {
      name: "custom-logs-plugin",
      version: "1.0.0",
    },
    spec: {
      // Change 'panels' to 'plugins' to fix the "not iterable" error
      plugins: [
        {
          kind: "Panel", // The category of the plugin
          spec: {
            name: "LogsTable", // This must match the kind in your <Panel />
            display: { name: "Custom Logs Table" },
          },
        },
      ],
    },
  }),
  // The component must be exported at the top level of this object
  LogsTable: LogsTable,
};

function App() {
  const iframeParams = useIframeParams();
  const token = iframeParams.token;
  const datasourceApi = React.useMemo(
    () =>
      new DatasourceApiImpl(
        iframeParams.lokiUrl ?? undefined,
        iframeParams.token,
      ),
    [iframeParams.lokiUrl, iframeParams.token],
  );

  const [timeRange, setTimeRange] = React.useState<TimeRangeValue>(() => {
    if (iframeParams.from && iframeParams.to) {
      return {
        start: new Date(iframeParams.from),
        end: new Date(iframeParams.to),
      };
    }
    return {
      pastDuration: iframeParams.range,
    };
  });

  const [refreshInterval, setRefreshInterval] =
    React.useState<DurationString>("0s");

  const muiTheme = getTheme("light");
  const chartsTheme = generateChartsTheme(muiTheme, {});

  const pluginLoader = dynamicImportPluginLoader([
    {
      resource: lokiPlugin.getPluginModule(),
      importPlugin: () => Promise.resolve(lokiPlugin),
    },
    {
      resource: timeseriesChartPlugin.getPluginModule(),
      importPlugin: () => Promise.resolve(timeseriesChartPlugin),
    },
    // {
    //   resource: logsTablePlugin.getPluginModule(),
    //   importPlugin: () => Promise.resolve(logsTablePlugin),
    // },
    {
      resource: customLogsTablePlugin.getPluginModule() as any,
      importPlugin: () => Promise.resolve(customLogsTablePlugin),
    },
  ]);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 0,
      },
    },
  });

  if (!token) {
    return <MissingTokenMessage />;
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <ChartsProvider chartsTheme={chartsTheme}>
        <SnackbarProvider
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          variant="default"
          content=""
        >
          <PluginRegistry
            pluginLoader={pluginLoader}
            defaultPluginKinds={{
              LogQuery: "LokiLogQuery",
              TimeSeriesQuery: "LokiTimeSeriesQuery",
            }}
          >
            <QueryClientProvider client={queryClient}>
              <TimeRangeProvider
                timeRange={timeRange}
                refreshInterval={refreshInterval}
                setTimeRange={setTimeRange}
                setRefreshInterval={setRefreshInterval}
              >
                <VariableProvider>
                  <DatasourceStoreProvider
                    dashboardResource={fakeDashboard}
                    datasourceApi={datasourceApi}
                  >
                    <DataQueriesProvider
                      definitions={[
                        {
                          kind: "LokiTimeSeriesQuery",
                          spec: {
                            query: iframeParams.logVolume,
                            limit: iframeParams.limit,
                          },
                        },
                      ]}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "160px",
                          paddingRight: "16px",
                          paddingBottom: "10px",
                          boxSizing: "border-box",
                        }}
                      >
                        <Panel
                          panelOptions={{}}
                          definition={{
                            kind: "Panel",
                            spec: {
                              display: { name: "Log Volume" },
                              plugin: {
                                kind: "TimeSeriesChart",
                                spec: {
                                  visual: {
                                    display: "bar",
                                    lineWidth: 1.25,
                                    lineStyle: "solid",
                                    areaOpacity: 0.3,
                                    pointRadius: 2.75,
                                    connectNulls: false,
                                    stack: "all",
                                  },
                                  queries: [
                                    {
                                      kind: "LokiTimeSeriesQuery",
                                      spec: {
                                        query: iframeParams.logVolume,
                                        limit: iframeParams.limit,
                                      },
                                    },
                                  ],

                                  chartOptions: {
                                    series: {
                                      type: "bar",
                                    },
                                    yAxis: {
                                      label: "Logs / minute",
                                      splitNumber: 1,
                                      axisLabel: {
                                        formatter: (value: number) =>
                                          value.toLocaleString(),
                                      },
                                    },

                                    xAxis: { splitLine: { show: false } },
                                  },
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    </DataQueriesProvider>

                    <DataQueriesProvider
                      definitions={[
                        {
                          kind: "LokiLogQuery",
                          spec: {
                            query: iframeParams.logQuery,
                            /// limit: iframeParams.limit,
                          },
                        },
                      ]}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "600px",
                          paddingRight: "16px",
                          boxSizing: "border-box",
                        }}
                      >
                        <Panel
                          definition={{
                            kind: "Panel",
                            spec: {
                              display: { name: "Logs", description: "dsd" },
                              plugin: {
                                kind: "LogsTable",
                                spec: {
                                  queries: [
                                    {
                                      kind: "LokiLogQuery",
                                      spec: {
                                        query: iframeParams.logQuery,
                                        //    limit: iframeParams.limit,
                                        direction: "forward",
                                      },
                                    },
                                  ],
                                  links: [
                                    {
                                      name: "test",
                                      url: "https://www.datadoghq.com/product/log-management/",
                                      tooltip: "",
                                      renderVariables: false,
                                      targetBlank: true,
                                    },
                                  ],
                                  showTime: true,
                                  allowWrap: true,
                                  enableDetails: true,
                                  showAll: true,
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    </DataQueriesProvider>
                  </DatasourceStoreProvider>
                </VariableProvider>
              </TimeRangeProvider>
            </QueryClientProvider>
          </PluginRegistry>
        </SnackbarProvider>
      </ChartsProvider>
    </ThemeProvider>
  );
}

export default App;
