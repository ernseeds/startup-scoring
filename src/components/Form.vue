<template>
  <!-- <NavBar /> -->
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
  </div>
</template>

<script>
import NavBar from "@/components/NavBar.vue";

export default {
  name: "Form",
  components: { NavBar },
  data() {
    return {
      questions: [
        { label: "1. 年度对公流水", options: ["100万以下", "100万-200万", "200万-500万", "500万以上"] },
        { label: "2. 年度增值税", options: ["1万以下", "1万-3万", "3万-5万", "5万以上"] },
        { label: "3. 银行代发工资人数", options: ["3人以下", "3-5人", "5-10人", "10人以上"] },
        { label: "4. 社保人数", options: ["3人以下", "3-5人", "5-10人", "10人以上"] },
        { label: "5. 法人网贷", options: ["3笔以上", "1-3笔", "0笔"] },
        { label: "6. 发明专利", options: ["0项", "1-3项", "3项以上"] },
        { label: "7. 科技属性", options: ["无", "科技入库企业", "高新技术企业", "专精特新企业"] },
        { label: "8. 上下游背书", options: ["无", "1-5笔央国企事业单位", "5笔以上央国企事业单位"] }
      ],
      answers: Array(8).fill(""),
      finalScore: null,
      scoreMapping: [
        { "100万以下": 2, "100万-200万": 6, "200万-500万": 8, "500万以上": 10 },
        { "1万以下": 2, "1万-3万": 6, "3万-5万": 8, "5万以上": 10 },
        { "3人以下": 2, "3-5人": 6, "5-10人": 8, "10人以上": 10 },
        { "3人以下": 2, "3-5人": 6, "5-10人": 8, "10人以上": 10 },
        { "3笔以上": 2, "1-3笔": 6, "0笔": 10 },
        { "0项": 2, "1-3项": 6, "3项以上": 10 },
        { "无": 2, "科技入库企业": 6, "高新技术企业": 8, "专精特新企业": 10 },
        { "无": 2, "1-5笔央国企事业单位": 8, "5笔以上央国企事业单位": 10 }
      ]
    };
  },
  methods: {
    calculateScore() {
      return this.answers.map((answer, index) => this.scoreMapping[index][answer] || 0);
    },
    handleSubmit() {
      if (!this.answers.every(answer => answer !== "")) {
        alert("请回答所有问题");
        return;
      }
      const scores = this.calculateScore();
      this.finalScore = scores.reduce((sum, score) => sum + score, 0);
      
      // Immediately navigate to the Results page, passing answers and finalScore.
      this.$router.push({
        path: "/results",
        query: {
          answers: JSON.stringify(this.answers),
          finalScore: this.finalScore
        }
      });
    }
  }
};
</script>

<style scoped>
.form-container {
  max-width: 90%;
  margin: 20px auto;
  padding: 30px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.15);
  font-family: "Arial", sans-serif; 
}
.form-title {
  text-align: center;
  font-size: 20px;
  color: black;
  margin-bottom: 25px;
  text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
  font-family: inherit; 
}
.question-block {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease-in-out;
  font-family: inherit;
}
.question-block:hover {
  transform: translateY(-3px);
  box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.15);
}
.question-label {
  font-size: 18px;
  color: #000000;
  margin-bottom: 10px;
  font-family: inherit;
}
.radio-label {
  font-size: 17px;
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background: #f3f4f6;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  font-family: inherit;
}
.radio-input {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #174b83;
  border-radius: 50%;
  margin-right: 10px;
  transition: all 0.3s ease-in-out;
  font-family: inherit;
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
  border-radius: 50%;
  margin: 3px auto;
}
.submit-btn {
  display: block;
  width: 100%;
  padding: 14px;
  font-size: 18px;
  color: black;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  text-transform: uppercase;
  font-family: inherit;
}
.submit-btn:hover {
  color: black;
  transform: scale(1.05);
}
</style>
