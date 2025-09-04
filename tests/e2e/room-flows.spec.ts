// E2E tests for room creation and joining flows
import { test, expect } from '@playwright/test';

test.describe('Room Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and ensure user is logged in
    await page.goto('/');
    // Add authentication steps here based on your auth flow
  });

  test('should create room and navigate to room page', async ({ page }) => {
    // Click create room button
    await page.click('[data-testid="create-room-button"]');
    
    // Fill out room form
    await page.fill('[name="name"]', 'Test Room E2E');
    await page.selectOption('[name="subject"]', 'Mathematics');
    await page.fill('[name="description"]', 'Test room for E2E testing');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Should navigate to room page
    await expect(page).toHaveURL(/\/room\/[a-f0-9-]+/);
    
    // Should see room content
    await expect(page.locator('h1')).toContainText('Test Room E2E');
  });

  test('should join existing room by code', async ({ page }) => {
    // Navigate to join room flow
    await page.click('[data-testid="join-room-button"]');
    
    // Enter room code
    await page.fill('[placeholder*="room code"]', 'ABC123');
    
    // Submit
    await page.click('[data-testid="join-room-submit"]');
    
    // Should navigate to room
    await expect(page).toHaveURL(/\/room\/[a-f0-9-]+/);
  });

  test('should handle room not found error', async ({ page }) => {
    await page.click('[data-testid="join-room-button"]');
    await page.fill('[placeholder*="room code"]', 'INVALID');
    await page.click('[data-testid="join-room-submit"]');
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText('Room not found');
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
  });

  test('should navigate to different pages via sidebar', async ({ page }) => {
    // Test navigation to profile
    await page.click('[data-testid="sidebar-profile"]');
    await expect(page).toHaveURL('/profile');
    
    // Test navigation to rooms
    await page.click('[data-testid="sidebar-rooms"]');
    await expect(page).toHaveURL('/rooms');
    
    // Test navigation to friends
    await page.click('[data-testid="sidebar-friends"]');
    await expect(page).toHaveURL('/temanku');
  });

  test('should close sidebar on outside click and recenter content', async ({ page }) => {
    // Ensure sidebar is open
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    // Click outside sidebar
    await page.click('main');
    
    // Sidebar should close
    await expect(page.locator('[role="navigation"]')).not.toBeVisible();
    
    // Main content should recenter
    await expect(page.locator('main')).toHaveClass(/mx-auto/);
  });

  test('should open sidebar with toggle button', async ({ page }) => {
    // Close sidebar first
    await page.click('main');
    await expect(page.locator('[role="navigation"]')).not.toBeVisible();
    
    // Click toggle button
    await page.click('[aria-label="Open sidebar"]');
    
    // Sidebar should open
    await expect(page.locator('[role="navigation"]')).toBeVisible();
  });

  test('should open sidebar on left edge hover', async ({ page }) => {
    // Close sidebar first
    await page.click('main');
    
    // Hover over left edge
    await page.hover('body', { position: { x: 1, y: 300 } });
    
    // Wait for hover delay
    await page.waitForTimeout(200);
    
    // Sidebar should open
    await expect(page.locator('[role="navigation"]')).toBeVisible();
  });

  test('should disable toggle when sidebar is open', async ({ page }) => {
    // Ensure sidebar is open
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    // Toggle button should not be visible when sidebar is open
    await expect(page.locator('[aria-label="Open sidebar"]')).not.toBeVisible();
  });

  test('should handle ESC key to close sidebar', async ({ page }) => {
    // Ensure sidebar is open
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    // Press ESC
    await page.keyboard.press('Escape');
    
    // Sidebar should close
    await expect(page.locator('[role="navigation"]')).not.toBeVisible();
  });

  test('should show only one Create Room button', async ({ page }) => {
    // Count Create Room buttons
    const createButtons = page.locator('text="Create Room"');
    await expect(createButtons).toHaveCount(1);
  });
});