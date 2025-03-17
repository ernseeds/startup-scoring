<template>
  <div class="form-container">
    <h2 class="form-title">融资雷达评估</h2>
    <form @submit.prevent="handleSubmit" class="evaluation-form">
      <div v-for="(question, index) in questions" :key="index" class="question-block">
        <p class="question-label">{{ question.label }}</p>
        <div v-for="(option, idx) in question.options" :key="idx" class="option">
          <label class="radio-label">
            <input
              type="radio"
              :name="`question-${index}`"
              :value="option"
              v-model="answers[index]"
              class="radio-input"
            />
            <span class="radio-text">{{ option }}</span>
          </label>
        </div>
      </div>
      <button type="submit" class="submit-btn">提交</button>
    </form>
    
    <div v-if="submitted" class="result">
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
    
      <div v-if="responseData && responseData.output" class="agent-output">
        <div v-html="formattedOutput" class="output-content"></div>
      </div>
    </div>
  </div>
</template>


<script>
import axios from "axios";
import { marked } from "marked"; // used for Markdown rendering
import { Chart } from "chart.js/auto";

export default {
  name: "StartupEvaluationForm",
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
      answers: Array(8).fill(""),
      submitted: false,
      responseData: { output: "", code: "" },
      appid: "1889123038365118464",
      apikey: "6a3d672801854eb5adb7ec3314d38f08.L1BW7HOkQJ5qTHgH",
      conversationId: null,
      finalScore: null,
      chart: null,
      scoreMapping: [
        { "100万以下": 2, "100万-200万": 6, "200万-500万": 8, "500万以上": 10 },
        { "1万以下": 2, "1万-3万": 6, "3万-5万": 8, "5万以上": 10 },
        { "3人以下": 2, "3-5人": 6, "5-10人": 8, "10人以上": 10 },
        { "3人以下": 2, "3-5人": 6, "5-10人": 8, "10人以上": 10 },
        { "3笔以上": 2, "1-3笔": 6, "0笔": 10 },
        { "0项": 2, "1-3项": 6, "3项以上": 10 },
        { "无": 2, "科技入家企业": 6, "高新技术企业": 8, "专精特新企业": 10 },
        { "无": 2, "1-5笔央国企事业单位": 8, "5笔以上央国企事业单位": 10 }
      ]
    };
  },
  computed: {
    formattedOutput() {
      return marked(this.responseData.output);
    }
  },
  methods: {
    calculateScore() {
      const scores = this.answers.map((answer, index) => {
        return this.scoreMapping[index][answer] || 0;
      });
      return scores;
    },
    drawChart(scores) {
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
            data: scores,
            fill: true,
            backgroundColor: "rgba(0, 0, 128, 0.2)", // Navy blue background with transparency
            borderColor: "rgba(0, 0, 128, 1)",        // Navy blue border
            pointBackgroundColor: "rgba(0, 0, 128, 1)"  // Navy blue points
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              suggestedMax: 10,
              ticks: {
                display: false // Hide numeric tick labels
              },
              pointLabels: {
                font: {
                  size: 16 // Increase the point label font size here
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
      // Update the overlay font size based on the container size.
      this.updateScoreOverlayFont();
    },
    updateScoreOverlayFont() {
      // Get the chart container element via a ref
      const container = this.$refs.chartContainer;
      if (container) {
        // For example, set the font size to 10% of the container's width
        const fontSize = container.clientWidth * 0.03;
        const overlay = container.querySelector(".score-overlay");
        if (overlay) {
          overlay.style.fontSize = fontSize + "px";
        }
      }
    },
    handleResize() {
      // When the window resizes, update the overlay font size.
      this.updateScoreOverlayFont();
    },
    async handleSubmit() {
      try {
        if (!this.answers.every(answer => answer !== "")) {
          alert("请回答所有问题");
          return;
        }
        this.submitted = true;
        const scores = this.calculateScore();
        this.finalScore = scores.reduce((sum, score) => sum + score, 0);
        this.$nextTick(() => {
          this.drawChart(scores);
        });
        // ... (existing conversation and SSE logic remains unchanged)
        console.log("用户答案：", this.answers);
        if (!this.conversationId) {
          const conversationUrl = `https://open.bigmodel.cn/api/llm-application/open/v2/application/${this.appid}/conversation`;
          const convResponse = await axios.post(conversationUrl, {}, {
            headers: {
              Authorization: `Bearer ${this.apikey}`,
              "Content-Type": "application/json"
            }
          });
          if (convResponse.status === 200 && convResponse.data.data && convResponse.data.data.conversation_id) {
            this.conversationId = convResponse.data.data.conversation_id;
          } else {
            throw new Error("Failed to create conversation");
          }
        }
        const userInput = this.questions
          .map((q, index) => `${q.label}: ${this.answers[index]}`)
          .join("\n");
        const key_value_pairs = [{
          id: "user",
          type: "input",
          name: "用户提问",
          value: userInput
        }];
        const requestIdUrl = "https://open.bigmodel.cn/api/llm-application/open/v2/application/generate_request_id";
        const reqIdResponse = await axios.post(requestIdUrl, {
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
        const requestId = reqIdResponse.data.data.id;
        const streamUrl = `https://open.bigmodel.cn/api/llm-application/open/v2/model-api/${requestId}/sse-invoke`;
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
        this.responseData.output = "";
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
                  }
                } catch (err) {
                  console.error("Error parsing SSE data:", err, dataLine);
                }
              }
            }
          }
          this.responseData.output = responseText;
        }
      } catch (error) {
        console.error("Error communicating with the backend:", error);
        this.responseData.output = `Error: ${error.message}`;
      }
    }
  },
  mounted() {
    window.addEventListener("resize", this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
  }
};
</script>

<style scoped>
.form-container {
  max-width: 90%;
  margin: 40px auto;
  padding: 30px;
  background: linear-gradient(135deg, #ecc062, #f39a67);
  border-radius: 12px;
  box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.15);
  font-family: "Arial", sans-serif;
}

.form-title {
  text-align: center;
  font-size: 28px;
  color: #ffffff;
  font-weight: bold;
  margin-bottom: 25px;
  text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
}

/* Question Block */
.question-block {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease-in-out;
}

.question-block:hover {
  transform: translateY(-3px);
  box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.15);
}

.question-label {
  font-weight: bold;
  font-size: 18px;
  color: #000000;
  margin-bottom: 10px;
}

/* Radio Button Styling */
.radio-label {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background: #f3f4f6;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.radio-label:hover {
  background: #e3f2fd;
  border-color: #007bff;
}

.radio-input {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #174b83;
  border-radius: 50%;
  margin-right: 10px;
  transition: all 0.3s ease-in-out;
}

.radio-input:checked {
  background-color: #082e57;
  border-color: #0f355e;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}

.radio-input:checked::before {
  content: "";
  display: block;
  width: 10px;
  height: 10px;
  /* background: white; */
  border-radius: 50%;
  margin: 3px auto;
}

/* Submit Button */
.submit-btn {
  display: block;
  width: 100%;
  padding: 14px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #f3d112, #ebc77b);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0px 4px 10px rgba(255, 105, 135, 0.3);
  transition: all 0.3s ease-in-out;
  text-transform: uppercase;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #fff240, #f7d872);
  transform: scale(1.05);
}

/* Result Section */
.result {
  margin-top: 30px;
  padding: 20px;
  border-top: 2px solid #ddd;
  background: #f9f9f9;
  border-radius: 8px;
}

.result-title {
  font-size: 28px;
  color: #000000;
  font-weight: bold;
  text-align: center;
  margin-bottom: 12px;
}

.result-list {
  list-style-type: none;
  padding: 10;
}

.result-item {
  padding: 8px 0;
  color: #555;
  font-size: 20px;
}

.score-title {
  margin-left: 39px;
  padding: 8px 0;
  font-size: 22px;
  color: #555;
}

/* Chart Section */
.chart-container {
  width: 90%;
  max-width: 1000px; /* Prevents the chart from being too large */
  height: auto;
  aspect-ratio: 1; /* Ensures a square shape */
  margin: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: #f9f9f9;
  border-radius: 10px;
  padding: 10px;
  /* box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1); */
  transition: all 0.3s ease-in-out;
  overflow: hidden; /* Prevents any content from spilling */
}

/* Make the canvas responsive */
.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  max-height: 100%;
}

.score-overlay {
  position: absolute;
  top: 50%;
  left: 47%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  font-weight: bold;
  color: #002853;
  text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.2);
}

/* AI Output */
.agent-output {
  margin-top: 25px;
  padding: 15px;
  background: #f7f2f4;
  border-radius: 6px;
  font-size: 16px;
  line-height: 1.6;
  color: #f11515;
  border-left: 5px solid #f7ef7e;
}
</style>
