import React from "react";
import cloneDeep from "lodash.clonedeep";
import { Row, Col, Tab } from "react-bootstrap";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";
import omit from "lodash.omit";

import CustomizedDialogs, { MarkdownLink } from "../shareDialog";
import { DEFAULT_COLOR, generateMonthlyActivityOption } from "../../constants";

const ActivityChart = ({
  repoList = ["apache/apisix"],
  showAlert,
  onDelete,
  onLoading
}) => {
  const [loading, setLoading] = React.useState(false);
  const [dataSource, setDataSource] = React.useState({});
  const [xAxis] = React.useState(["1970-01-01"]);
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [option, setOption] = React.useState(
    generateMonthlyActivityOption({
      handleShareClick: () => {
        setShareModalVisible(true);
      }
    })
  );

  const Dialog = React.useCallback(() => {
    return (
      <CustomizedDialogs
        open={shareModalVisible}
        params={getShareParams()}
        onChange={() => {
          setShareModalVisible(false);
        }}
      />
    );
  }, [shareModalVisible]);

  const updateSeries = passXAxis => {
    const newClonedOption = cloneDeep(
      generateMonthlyActivityOption({
        handleShareClick: () => {
          setShareModalVisible(true);
        }
      })
    );
    const datasetWithFilters = [
      ["ContributorNum", "Repo", "Date", "DateValue"]
    ];
    const legend = [];
    const limitDate = new Date(passXAxis[0]).getTime();

    Object.entries(dataSource).forEach(([key, value]) => {
      legend.push(key);
      value.forEach(item => {
        datasetWithFilters.push([
          item.contributorNum,
          item.repo,
          item.date,
          new Date(item.date).getTime()
        ]);
      });
    });

    const newDateSet = datasetWithFilters.sort(
      (a, b) => new Date(a[2]) - new Date(b[2])
    );

    const filterDataset = legend.map(item => ({
      id: item,
      fromDatasetId: "dataset_raw",
      transform: {
        type: "filter",
        config: {
          and: [
            { dimension: "Repo", "=": item },
            { dimension: "DateValue", gte: limitDate }
          ]
        }
      }
    }));

    const series = legend.map(item => ({
      name: item,
      type: "line",
      datasetId: item,
      showSymbol: false,
      encode: {
        x: "Date",
        y: "ContributorNum",
        itemName: "Repo",
        tooltip: ["ContributorNum"]
      }
    }));

    if (series.length === 1) {
      series[0].areaStyle = {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: DEFAULT_COLOR + "80"
          },
          {
            offset: 1,
            color: DEFAULT_COLOR + "00"
          }
        ])
      };
      series[0].itemStyle = {
        normal: {
          color: DEFAULT_COLOR,
          lineStyle: {
            color: DEFAULT_COLOR
          }
        }
      };
    }

    newClonedOption.dataset = [
      {
        id: "dataset_raw",
        source: newDateSet
      }
    ].concat(filterDataset);

    newClonedOption.series = series;
    newClonedOption.legend.data = legend;

    setOption(newClonedOption);
  };

  const fetchData = repo => {
    if (repo === "null" || repo === null) {
      repo = "apache/apisix";
    }
    return new Promise((resolve, reject) => {
      fetch(
        `https://contributor-overtime-api.apiseven.com/monthly-contributor?repo=${repo}`
      )
        .then(response => {
          if (!response.ok) {
            onDelete(repo);
            let message = "";
            switch (response.status) {
              case 403:
                message = "Hit rate limit";
                break;
              case 404:
                message = "Repo format error / Repo not found";
                break;
              default:
                message = "Request Error";
                break;
            }
            throw message;
          }
          return response.json();
        })
        .then(myJson => {
          resolve({ repo, ...myJson });
        })
        .catch(e => {
          showAlert(e, "error");
          reject();
        });
    });
  };

  React.useEffect(() => {
    updateSeries(xAxis);
    window.parent.postMessage({ legend: Object.keys(dataSource) }, "*");
  }, [dataSource, xAxis]);

  React.useEffect(() => {
    onLoading(loading);
  }, [loading]);

  React.useEffect(() => {
    const datasourceList = Object.keys(dataSource);

    if (datasourceList.length > repoList.length) {
      const deleteList = datasourceList.filter(
        item => !repoList.includes(item)
      );
      console.log("deleteList: ", deleteList);
      const clonedDatasource = cloneDeep(dataSource);
      setDataSource(omit(clonedDatasource, deleteList));
      return;
    }

    const updateList = repoList.filter(item => !datasourceList.includes(item));
    setLoading(true);
    Promise.all(updateList.map(item => fetchData(item)))
      .then(data => {
        const tmpDataSouce = {};
        data.forEach(item => {
          const { Contributors = [], repo } = item;

          const data = Contributors.map(item => ({
            repo,
            contributorNum: item.Num,
            date: item.Month
          }));

          if (!tmpDataSouce[item.repo]) {
            tmpDataSouce[repo] = data;
          }
        });

        const clonedDatasource = cloneDeep(dataSource);
        setDataSource({ ...clonedDatasource, ...tmpDataSouce });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [repoList]);

  const getShareParams = () =>
    `?chart=contributorMonthlyActivity&repo=${repoList.join(",")}`;

  return (
    <>
      <div
        className="content"
        style={{
          display: "flex",
          justifyContent: "center"
        }}
      >
        <Dialog />
        <div className="right" style={{ width: "90%", marginTop: "10px" }}>
          <div id="chart">
            <Tab.Container defaultActiveKey="contributor">
              <Row>
                <Col>
                  <Tab.Content>
                    <Tab.Pane eventKey="contributor">
                      <ReactECharts
                        option={option}
                        ref={e => {
                          if (e) {
                            const echartInstance = e.getEchartsInstance();
                            // then you can use any API of echarts.
                            window.echartInstance = echartInstance;
                          }
                        }}
                        style={{ height: 550 }}
                        showLoading={loading}
                        notMerge
                      />
                      <MarkdownLink
                        params={getShareParams()}
                        type="contributorMonthlyActivity"
                      />
                    </Tab.Pane>
                  </Tab.Content>
                </Col>
              </Row>
            </Tab.Container>
          </div>
        </div>
      </div>
    </>
  );
};

export default ActivityChart;
