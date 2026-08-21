import { expect, test } from "@playwright/test";

test("task shelf wizard completes without typing", async ({ page }) => {
    await page.goto("/create");

    const shelf = page.getByTestId("create-task-shelf");
    await expect(shelf).toBeVisible();
    await expect(shelf.locator(":scope > button")).toHaveCount(6);

    await page.getByTestId("create-task-card-product-launch-poster").click();
    const wizard = page.getByTestId("create-template-wizard-product-launch-poster");
    await expect(wizard).toBeVisible();
    await expect(wizard.getByText("这张图主要用在哪里？")).toBeVisible();

    let submittedPrompt = "";
    await page.route("**/api/agent/runs", async (route) => {
        submittedPrompt = route.request().postData() || "";
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: 500, msg: "e2e-intercepted" }) });
    });

    await wizard.getByRole("button", { name: "你看着办" }).click();
    await expect.poll(() => submittedPrompt).toContain("为我的商品设计一张上新宣传海报");
    expect(submittedPrompt).toContain("用于朋友圈和社群传播");
    await expect(wizard).not.toBeVisible();
    await expect(page.getByTestId("creative-message-list")).toContainText("为我的商品设计一张上新宣传海报");

    await page.goto("/create");
    await expect(page.getByTestId("create-task-shelf")).toBeVisible();

    await page.getByTestId("create-task-card-product-launch-poster").click();
    await expect(wizard).toBeVisible();
    await wizard.getByRole("button", { name: /门店张贴/ }).click();
    await expect(wizard.getByText("想要哪种感觉？")).toBeVisible();
    await wizard.getByRole("button", { name: "上一步" }).click();
    await expect(wizard.getByText("这张图主要用在哪里？")).toBeVisible();
    await wizard.getByRole("button", { name: /朋友圈 \/ 社群/ }).click();
    await expect(wizard.getByText("想要哪种感觉？")).toBeVisible();
    await wizard.getByRole("button", { name: /简约高级/ }).click();
    await expect(wizard.getByText("最想突出什么？")).toBeVisible();
    await wizard.getByRole("button", { name: /价格优惠/ }).click();

    const startButton = wizard.getByRole("button", { name: "就这样，开始创作" });
    await expect(startButton).toBeEnabled();
    submittedPrompt = "";
    await startButton.click();
    await expect.poll(() => submittedPrompt).toContain("为我的商品设计一张上新宣传海报");
    expect(submittedPrompt).toContain("用于朋友圈和社群传播");
    expect(submittedPrompt).toContain("简约高级");
    expect(submittedPrompt).toContain("价格优惠力度");
});

test("task shelf stays usable on narrow viewports", async ({ page }) => {
    await page.goto("/create");
    const shelf = page.getByTestId("create-task-shelf");
    await expect(shelf).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByTestId("create-task-card-product-showcase-video").click();
    const wizard = page.getByTestId("create-template-wizard-product-showcase-video");
    await expect(wizard).toBeVisible();
    await expect(wizard.getByText("喜欢什么节奏？")).toBeVisible();
});
