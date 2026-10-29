import { expect, type Page } from '@playwright/test';
import { v1 } from './env';
import { loginV1, openV1Login } from './v1-ui';

const pages = {
  'Home Page': {
    fields: [
      ["xpath=//input[contains(@placeholder,'Traders')]", 'ATG-CMS-TEST Category Line'],
      ["xpath=//textarea[contains(@placeholder,\"white part\")]", 'ATG-CMS-TEST Slide White Title'],
      ["xpath=//input[contains(@placeholder,\"Yellow accent\")]", 'ATG-CMS-TEST Yellow Accent'],
      ["xpath=//textarea[contains(@placeholder,\"Slide subtitle\")]", 'ATG-CMS-TEST Subtitle fixed text for automation.'],
    ],
    verify: v1.publicHome,
    texts: [
      'ATG-CMS-TEST Category Line',
      'ATG-CMS-TEST Slide White Title',
      'ATG-CMS-TEST Yellow Accent',
      'ATG-CMS-TEST Subtitle fixed text for automation.',
    ],
  },
  'About ATG Page': {
    fields: [
      ["xpath=//input[contains(@placeholder,'Label') and contains(@placeholder,'ABOUT')]", 'ATG-CMS-TEST ABOUT LABEL'],
      ["xpath=//textarea[contains(@placeholder,'MAIN TITLE')]", 'AFRICA TRADE GATEWAY RF TEST'],
      ["xpath=//input[contains(@placeholder,'CTA Title')]", 'ATG-CMS-TEST CTA title for partners'],
      ["xpath=//input[contains(@placeholder,'Link text')]", 'ATG-CMS-TEST Explore link text'],
      ["xpath=//input[contains(@placeholder,'Card 1')]", 'ATG-CMS-TEST Card 1 title'],
      ["xpath=//input[contains(@placeholder,'Card 2')]", 'ATG-CMS-TEST Card 2 title'],
      ["xpath=//input[contains(@placeholder,'Card 3')]", 'ATG-CMS-TEST Card 3 title'],
    ],
    quill: '<p><strong>ATG-CMS-TEST</strong> About page body - automation run.</p>',
    verify: v1.publicAbout,
    texts: [
      'ATG-CMS-TEST ABOUT LABEL',
      'AFRICA TRADE GATEWAY RF TEST',
      'ATG-CMS-TEST CTA title for partners',
      'ATG-CMS-TEST Explore link text',
      'ATG-CMS-TEST Card 1 title',
      'ATG-CMS-TEST Card 2 title',
      'ATG-CMS-TEST Card 3 title',
    ],
  },
  'ATG Ecosystem Page': {
    fields: [
      ["xpath=//input[contains(@placeholder,'OUR SOLUTIONS')]", 'ATG-CMS-TEST Our Solutions'],
      ["xpath=//textarea[contains(@placeholder,'THE ATG ECOSYSTEM')]", 'ATG-CMS-TEST THE ATG ECOSYSTEM RF'],
      ["xpath=//input[contains(@placeholder,'SIX KEY PILLARS')]", 'ATG-CMS-TEST Six Key Pillars'],
      ["xpath=//textarea[contains(@placeholder,'six key pillars that are essential for trade in Africa')]", 'ATG-CMS-TEST Intro: six pillars essential for trade - automation.'],
      ["xpath=//input[contains(@placeholder,'How could they benefit your business')]", 'ATG-CMS-TEST How could they benefit your business?'],
      ["xpath=(//input[contains(@placeholder,'ATEX, MANSA')])[1]", 'ATG-CMS-TEST ATEX'],
      ["xpath=(//input[contains(@placeholder,'ATG for Matchmaking')])[1]", 'ATG-CMS-TEST Pillar subtitle RF'],
      ["xpath=(//textarea[contains(@placeholder,'Brief description of the pillar')])[1]", 'ATG-CMS-TEST Brief pillar description for automation.'],
      ["xpath=//input[contains(@placeholder,'Financial institution, service provider or trade association') and not(contains(@placeholder,'CTA Title'))]", 'ATG-CMS-TEST CTA ecosystem partners'],
      ["xpath=//input[contains(@placeholder,'Explore the ATG ecosystem for partners')]", 'ATG-CMS-TEST Explore ecosystem link'],
    ],
    verify: v1.publicSolutions,
    texts: [
      'ATG-CMS-TEST Our Solutions',
      'ATG-CMS-TEST THE ATG ECOSYSTEM RF',
      'ATG-CMS-TEST Six Key Pillars',
      'ATG-CMS-TEST Intro: six pillars essential for trade - automation.',
      'ATG-CMS-TEST How could they benefit your business?',
      'ATG-CMS-TEST ATEX',
      'ATG-CMS-TEST Pillar subtitle RF',
      'ATG-CMS-TEST Brief pillar description for automation.',
      'ATG-CMS-TEST CTA ecosystem partners',
      'ATG-CMS-TEST Explore ecosystem link',
    ],
  },
} as const;

const footerSuffix = 'ATG-CMS-TEST FOOTER';
const footerFields: Array<[string, string]> = [
  ["xpath=//input[@placeholder='Contact']", `Contact ${footerSuffix}`],
  ["xpath=//textarea[contains(@placeholder,'El-Maahad El-Eshteraky Street')]", `72 Test Street - Cairo - ${footerSuffix}`],
  ["xpath=//input[@placeholder='atg@afreximbank.com']", 'footer.test@atg.africa'],
  ["xpath=//textarea[contains(@placeholder,'+20-2-24564100/1/2/3')]", `+20-2-10000000 / +20-2-20000000 ${footerSuffix}`],
  ["xpath=//input[@placeholder='Our Solutions']", `Our Solutions ${footerSuffix}`],
  ["xpath=(//input[@placeholder='Link 1 label'])[1]", `B2B eCommerce ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/solutions/...'])[1]", '/solutions/ecommerce-atex'],
  ["xpath=(//input[@placeholder='Link 2 label'])[1]", `Due Diligence ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/solutions/...'])[2]", '/solutions/due-diligence-mansa'],
  ["xpath=(//input[@placeholder='Link 3 label'])[1]", `Connections ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/solutions/...'])[3]", '/solutions/atg-connect'],
  ["xpath=(//input[@placeholder='Link 4 label'])[1]", `Market Intelligence ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/solutions/...'])[4]", '/solutions/market-intelligence-tradar-club'],
  ["xpath=(//input[@placeholder='Link 5 label'])[1]", `Payments ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/solutions/...'])[5]", '/solutions/payments-papss'],
  ["xpath=//input[@placeholder='Our Community']", `Our Community ${footerSuffix}`],
  ["xpath=(//input[@placeholder='Link 1 label'])[2]", `Cross-border businesses ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/our-community/...'])[1]", '/our-community/cross-border-businesses'],
  ["xpath=(//input[@placeholder='Link 2 label'])[2]", `Financial institutions ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/our-community/...'])[2]", '/our-community/financial-institutions'],
  ["xpath=(//input[@placeholder='Link 3 label'])[2]", `Service providers ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/our-community/...'])[3]", '/our-community/service-providers'],
  ["xpath=//input[@placeholder='Resources']", `Resources ${footerSuffix}`],
  ["xpath=(//input[@placeholder='Link 1 label'])[3]", `News and Events ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/resources/...'])[1]", '/news-events/news-from-atg'],
  ["xpath=(//input[@placeholder='Link 2 label'])[3]", `Events ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/resources/...'])[2]", '/news-events/events'],
  ["xpath=(//input[@placeholder='Link 3 label'])[3]", `Case studies ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/resources/...'])[3]", '/resources/case-studies'],
  ["xpath=(//input[@placeholder='Link 4 label'])[2]", `FAQ ${footerSuffix}`],
  ["xpath=(//input[@placeholder='/resources/...'])[4]", '/resources/faq'],
  ["xpath=//input[@placeholder='Powered by']", `Powered by ${footerSuffix}`],
  ["xpath=//input[@placeholder='Partners']", `Partners ${footerSuffix}`],
  ["xpath=//input[@placeholder='In collaboration with']", `In collaboration with ${footerSuffix}`],
  ["xpath=//input[@placeholder='Terms & Conditions']", `Terms and Conditions ${footerSuffix}`],
  ["xpath=//input[@placeholder='/terms-and-conditions']", '/terms-and-conditions'],
  ["xpath=//input[@placeholder='Privacy Policy']", `Privacy Policy ${footerSuffix}`],
  ["xpath=//input[@placeholder='/privacy-policy']", '/privacy-policy'],
];

async function openCms(page: Page): Promise<void> {
  await page.locator("xpath=//div[contains(@class,'ant-menu-submenu-title')][.//span[normalize-space(.)='General Management']]").click();
  await page.locator("xpath=//li[@role='menuitem'][.//span[normalize-space(.)='Content Management']]").click();
  await page.locator("xpath=//span[contains(normalize-space(.),'Editing')]/following-sibling::div[contains(@class,'ant-select')]").waitFor();
}

async function selectEditingPage(page: Page, pageName: string): Promise<void> {
  const trigger = page.locator("xpath=//span[contains(normalize-space(.),'Editing')]/following-sibling::div[contains(@class,'ant-select')]//div[contains(@class,'ant-select-selector')]");
  await trigger.click();
  const option = page.locator(`xpath=//div[contains(@class,'ant-select-item-option')][normalize-space(.)='${pageName}']`);
  for (let i = 0; i < 15 && !(await option.isVisible().catch(() => false)); i += 1) {
    await page.evaluate(() => {
      const holder = document.querySelector('.ant-select-dropdown .rc-virtual-list-holder') as HTMLElement | null;
      if (holder) holder.scrollTop += 220;
    });
  }
  await option.click();
}

async function clearAndType(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.scrollIntoViewIfNeeded();
  await field.click();
  await field.fill(value);
}

async function save(page: Page): Promise<void> {
  const button = page.locator("xpath=//button[contains(@class,'ant-btn-primary')][.//span[normalize-space(.)='Save']]");
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeEnabled();
  await button.click();
}

export async function editCmsPage(page: Page, pageName: string, verifyPublic: boolean): Promise<void> {
  await openV1Login(page);
  await loginV1(page, 'admin');
  await openCms(page);
  await selectEditingPage(page, pageName);
  if (pageName === 'Footer') {
    for (const [selector, value] of footerFields) await clearAndType(page, selector, value);
    await save(page);
    return;
  }
  const spec = pages[pageName as keyof typeof pages];
  if (!spec) throw new Error(`CMS page not covered: ${pageName}`);
  for (const [selector, value] of spec.fields) await clearAndType(page, selector, value);
  if ('quill' in spec) {
    await page.locator("xpath=//div[contains(@class,'ql-editor')][@contenteditable='true']").evaluate((el, html) => {
      el.innerHTML = html as string;
    }, spec.quill);
  }
  await save(page);
  if (!verifyPublic) return;
  await page.goto(spec.verify);
  await page.reload();
  for (const text of spec.texts) {
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 20_000 });
  }
}
