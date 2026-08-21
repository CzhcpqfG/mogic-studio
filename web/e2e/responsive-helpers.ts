import { expect, type Locator, type Page } from "@playwright/test";

export function billingProductsFixture() {
    const timestamp = "2026-08-02T00:00:00.000Z";
    return Array.from({ length: 8 }, (_, index) => ({
        id: `e2e-plan-${index + 1}`,
        productKind: "points",
        name: `E2E 创作积分包 ${index + 1}`,
        description: `用于验证多套餐响应式布局 ${index + 1}`,
        amountCents: (index + 1) * 900,
        currency: "CNY",
        pointsAmount: (index + 1) * 100,
        dailyPoints: 0,
        periodDays: 0,
        enabled: true,
        sortOrder: index,
        metadata: { recommended: index === 2, features: ["图片与视频创作", "订单和积分流水可查", "支付成功自动到账"] },
        pricing: {
            listUnitAmountCents: (index + 1) * 1_000,
            saleUnitAmountCents: (index + 1) * 900,
            discountCents: (index + 1) * 100,
            promotion: { id: `promo-${index + 1}`, label: "限时优惠", unitAmountCents: (index + 1) * 900, startsAt: timestamp, endsAt: timestamp },
        },
        createdAt: timestamp,
        updatedAt: timestamp,
    }));
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
    await expect
        .poll(async () =>
            page.evaluate(() => ({
                viewport: window.innerWidth,
                documentClientWidth: document.documentElement.clientWidth,
                documentScrollWidth: document.documentElement.scrollWidth,
                bodyClientWidth: document.body.clientWidth,
                bodyScrollWidth: document.body.scrollWidth,
            })),
        )
        .toMatchObject({
            documentScrollWidth: expect.any(Number),
            bodyScrollWidth: expect.any(Number),
        });
    const sizes = await page.evaluate(() => ({
        document: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
        body: [document.body.clientWidth, document.body.scrollWidth],
        overflowers: [...document.querySelectorAll<HTMLElement>("body *")]
            .map((element) => {
                const bounds = element.getBoundingClientRect();
                return {
                    tag: element.tagName,
                    ariaLabel: element.getAttribute("aria-label"),
                    className: typeof element.className === "string" ? element.className : "",
                    left: Math.round(bounds.left),
                    right: Math.round(bounds.right),
                    width: Math.round(bounds.width),
                };
            })
            .filter((item) => item.left < -1 || item.right > document.documentElement.clientWidth + 1)
            .slice(0, 8),
    }));
    expect(sizes.document[1], `${label} document overflow: ${JSON.stringify(sizes.overflowers)}`).toBeLessThanOrEqual(sizes.document[0] + 1);
    expect(sizes.body[1], `${label} body overflow`).toBeLessThanOrEqual(sizes.body[0] + 1);
}

export async function expectVisibleControlsWithinViewport(page: Page, label: string) {
    const offenders = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const controls = [...document.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [role="button"], [role="tab"], [role="menuitem"]')];
        const horizontallyScrollable = (element: HTMLElement) => {
            for (let current = element.parentElement; current && current !== document.body; current = current.parentElement) {
                const style = getComputedStyle(current);
                if (/auto|scroll/.test(style.overflowX) && current.scrollWidth > current.clientWidth + 1) return true;
            }
            return false;
        };
        return controls
            .map((element) => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                    element,
                    rect,
                    style,
                    label: element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.tagName,
                };
            })
            .filter(({ element, rect, style }) => {
                if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
                if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
                if (element.closest('[aria-hidden="true"], [inert]')) return false;
                return !horizontallyScrollable(element) && (rect.left < -1 || rect.right > viewportWidth + 1);
            })
            .slice(0, 12)
            .map(({ element, rect, label: controlLabel }) => ({
                tag: element.tagName,
                label: controlLabel,
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                viewportWidth,
            }));
    });
    expect(offenders, `${label} visible controls outside viewport`).toEqual([]);
}

export async function expectDialogWithinViewport(dialog: Locator) {
    await expect
        .poll(async () => {
            const bounds = await dialog.boundingBox();
            const viewport = dialog.page().viewportSize();
            return Boolean(bounds && viewport && bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1);
        })
        .toBe(true);
}

export async function openCreativeHistory(page: Page) {
    const dialog = page.getByRole("dialog", { name: "创作历史" });
    const desktopPanel = page.locator("aside").filter({ has: page.getByRole("heading", { name: "创作历史", exact: true }) });
    const surface = (page.viewportSize()?.width || 0) >= 1024 ? desktopPanel : dialog;
    if (!(await surface.isVisible().catch(() => false))) {
        const openButton = page.getByTestId("creative-page-tools").getByRole("button", { name: "打开创作历史" });
        await expect(openButton).toBeVisible();
        await openButton.click();
    }
    await expect(surface).toBeVisible();
    return surface;
}
