<template>
  <div class="result-page">
    <h3 class="result-title">结果</h3>
    <ul class="result-list">
      <li v-for="(answer, index) in answers" :key="index" class="result-item">
        <strong>{{ questions[index].label }}：</strong>{{ answer }}
      </li>
    </ul>
    <div v-if="finalScore !== null" class="score-chart">
      <h3 class="score-title">总评分: {{ finalScore }}</h3>
      <div ref="chartContainer" class="chart-container">
        <canvas id="radarChart"></canvas>
        <div class="score-overlay">{{ finalScore }}</div>
      </div>
    </div>
    <div id="suggestion">建议改进的领域</div>
    <div class="agent-output" v-if="responseData && responseData.output">
      <div v-html="formattedOutput" class="output-content"></div>
    </div>
    <!-- Loading indicator for SSE -->
    <div v-else class="loading">加载中...</div>
  </div>
</template>

<script>
import axios from "axios";
import { marked } from "marked";
import { Chart } from "chart.js/auto";

export default {
  name: "Results",
  data() {
    return {
      questions: [
        { label: "1. 年度对公流水", options: ["100万以下", "100万-200万", "200万-500万", "500万以上"] },
        { label: "2. 年度增值税", options: ["1万以下", "1万-3万", "3万-5万", "5万以上"] },
        { label: "3. 银行代发工资人数", options: ["3人以下", "3-5人", "5-10人", "10人以上"] },
        { label: "4. 社保人数", options: ["3人以下", "3-5人", "5-10人", "10人以上"] },
        { label: "5. 法人网贷", options: ["3笔以上", "1-3笔", "0笔"] },
        { label: "6. 发明专利", options: ["0项", "1-3项", "3项以上"] },
        { label: "7. 科技属性", options: ["无", "科技入家企业", "高新技术企业", "专精特新企业"] },
        { label: "8. 上下游背书", options: ["无", "1-5笔央国企事业单位", "5笔以上央国企事业单位"] }
      ],
      scoreMapping: [
        { "100万以下": 2, "100万-200万": 6, "200万-500万": 8, "500万以上": 10 },
        { "1万以下": 2, "1万-3万": 6, "3万-5万": 8, "5万以上": 10 },
        { "3人以下": 2, "3-5人": 6, "5-10人": 8, "10人以上": 10 },
        { "3人以下": 2, "3-5人": 6, "5-10人": 8, "10人以上": 10 },
        { "3笔以上": 2, "1-3笔": 6, "0笔": 10 },
        { "0项": 2, "1-3项": 6, "3项以上": 10 },
        { "无": 2, "科技入家企业": 6, "高新技术企业": 8, "专精特新企业": 10 },
        { "无": 2, "1-5笔央国企事业单位": 8, "5笔以上央国企事业单位": 10 }
      ],
      answers: JSON.parse(this.$route.query.answers || "[]"),
      finalScore: this.$route.query.finalScore || null,
      responseData: { output: "" },
      conversationId: null,
      requestId: null,
      // API key and App ID
      apikey: "6a3d672801854eb5adb7ec3314d38f08.L1BW7HOkQJ5qTHgH",
      appid: "1889123038365118464",
      chart: null
    };
  },
  computed: {
    formattedOutput() {
      return marked(this.responseData.output);
    }
  },
  mounted() {
    this.drawChart();
    window.addEventListener("resize", this.handleResize);
    this.setupConversationAndSSE();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
  },
  methods: {
    handleResize() {
      this.updateScoreOverlayPosition();
      this.updateScoreOverlayFont();
    },
    async setupConversationAndSSE() {
      try {
        // Create conversation.
        const convResponse = await axios.post(
          `https://open.bigmodel.cn/api/llm-application/open/v2/application/${this.appid}/conversation`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.apikey}`,
              "Content-Type": "application/json"
            }
          }
        );
        if (convResponse.status === 200 && convResponse.data.data && convResponse.data.data.conversation_id) {
          this.conversationId = convResponse.data.data.conversation_id;
        } else {
          throw new Error("Failed to create conversation");
        }
        // Build user input string.
        const userInput = this.questions
          .map((q, index) => `${q.label}: ${this.answers[index]}`)
          .join("\n");
        const key_value_pairs = [{
          id: "user",
          type: "input",
          name: "用户提问",
          value: userInput
        }];
        // Generate request ID.
        const reqIdResponse = await axios.post(
          `https://open.bigmodel.cn/api/llm-application/open/v2/application/generate_request_id`,
          {
            app_id: this.appid,
            conversation_id: this.conversationId,
            key_value_pairs: key_value_pairs
          },
          {
            headers: {
              Authorization: `Bearer ${this.apikey}`,
              "Content-Type": "application/json",
              accept: "*/*"
            }
          }
        );
        if (!reqIdResponse.data || !reqIdResponse.data.data || !reqIdResponse.data.data.id) {
          throw new Error("Failed to generate request ID: Unexpected response structure");
        }
        this.requestId = reqIdResponse.data.data.id;
        // Start SSE stream.
        this.startSSE();
      } catch (error) {
        console.error("Error in setupConversationAndSSE:", error);
      }
    },
    async startSSE() {
      try {
        const streamUrl = `https://open.bigmodel.cn/api/llm-application/open/v2/model-api/${this.requestId}/sse-invoke`;
        const streamResponse = await fetch(streamUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apikey}`,
            accept: "text/event-stream"
          }
        });
        if (!streamResponse.ok) {
          throw new Error(`Stream request failed: ${streamResponse.status}`);
        }
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let responseText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const dataLine = line.substring(5).trim();
              if (dataLine) {
                try {
                  const dataObj = JSON.parse(dataLine);
                  if (dataObj.msg) {
                    responseText += dataObj.msg;
                    this.responseData.output = responseText;
                  }
                } catch (err) {
                  console.error("Error parsing SSE data:", err, dataLine);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in SSE streaming:", error);
      }
    },
    drawChart() {
      const calculatedScores = this.answers.map((answer, index) => this.scoreMapping[index][answer] || 0);
      const ctx = document.getElementById("radarChart").getContext("2d");
      if (this.chart) {
        this.chart.destroy();
      }
      this.chart = new Chart(ctx, {
        type: "radar",
        data: {
          labels: this.questions.map(q => q.label),
          datasets: [{
            label: "评分",
            data: calculatedScores,
            fill: true,
            backgroundColor: "rgba(0, 0, 128, 0.2)",
            borderColor: "rgba(0, 0, 128, 1)",
            pointBackgroundColor: "rgba(0, 0, 128, 1)"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 20, bottom: 20, left: 20, right: 20 }
          },
          scales: {
            r: {
              min: 0,
              max: 10,
              ticks: {
                callback: function(value) {
                  return value;
                }
              },
              afterBuildTicks: function(scale) {
                // Define grid lines at specific values.
                scale.ticks = [
                  { value: 0, label: "0" },
                  { value: 2, label: "2" },
                  { value: 6, label: "6" },
                  { value: 8, label: "8" },
                  { value: 10, label: "10" }
                ];
              },
              pointLabels: { font: { size: 16 } }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
      // Position and style the overlay after the chart has rendered.
      this.updateScoreOverlayPosition();
      this.updateScoreOverlayFont();
    },
    updateScoreOverlayPosition() {
      // Compute the center based on container dimensions and apply a horizontal offset.
      this.$nextTick(() => {
        const container = this.$refs.chartContainer;
        if (container) {
          // Compute container center.
          const centerX = container.clientWidth / 2;
          const centerY = container.clientHeight / 2;
          // Apply a horizontal offset (5% of container width) to shift overlay left.
          const offsetX = container.clientWidth * 0.05; // Adjust this value if needed.
          const overlay = container.querySelector(".score-overlay");
          if (overlay) {
            overlay.style.left = (centerX - offsetX) + "px";
            overlay.style.top = centerY + "px";
            overlay.style.transform = "translate(-50%, -50%)";
          }
        }
      });
    },
    updateScoreOverlayFont() {
      const container = this.$refs.chartContainer;
      if (container) {
        const fontSize = container.clientWidth * 0.03;
        const overlay = container.querySelector(".score-overlay");
        if (overlay) {
          overlay.style.fontSize = fontSize + "px";
        }
      }
    }
  }
};
</script>

<style scoped>
.result-page {
  max-width: 100%;
  margin: 30px auto;
  padding: 10px;
  background: #ffffff;
  border-radius: 12px;
  font-family: "Arial", sans-serif;
}
.result-title {
  font-size: 26px;
  color: #000;
  font-weight: bold;
  text-align: center;
  margin-bottom: 12px;
}
.result-list {
  list-style-type: none;
  padding: 40px;
}
.result-item {
  padding: 8px 0;
  color: #555;
  font-size: 18px;
}
.score-title {
  margin-left: 40px;
  padding: 8px 0;
  font-size: 20px;
  color: #555;
}
.chart-container {
  position: relative;
  width: 100%;
  max-width: 1000px;
  aspect-ratio: 1;
  margin: auto;
  background: white;
  border-radius: 10px;
  padding: 10px;
  overflow: hidden;
}
.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  max-height: 100%;
}
.score-overlay {
  position: absolute;
  font-size: 20px;
  font-weight: bold;
  color: #002853;
  text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.2);
}
#suggestion {
  margin: 30px auto;
  font-size: 21px;
  font-weight: bold;
}
.agent-output {
  width: 100%;
  margin-top: 25px;
  padding: 5px;
  background: #f9f9f9;
  border-radius: 6px;
  font-size: 15px;
  line-height: 1.6;
  color: #000;
  border-left: 5px solid #b0b0b0;
}
.loading {
  text-align: center;
  font-size: 18px;
  color: #555;
  margin-top: 20px;
}

@media (max-width: 600px) {
  .chart-container {
    padding: 10px;
  }
  .result-title {
    font-size: 20px;
  }
  .score-title {
    font-size: 18px;
  }
  .score-overlay {
    font-size: 16px;
  }
  .result-list {
    padding: 20px;
  }
  .result-item {
    font-size: 16px;
  }
}
</style>
