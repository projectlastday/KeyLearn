<?php

use App\Models\User;

test('unverified users are redirected when accessing protected workspace pages', function () {
    $user = User::factory()->create([
        'phone_verified_at' => null,
    ]);

    $response = $this->actingAs($user)->get('/workspaces');

    $response->assertRedirect(route('phone.verify.notice'));
});

test('verified users can access protected workspace pages', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/workspaces');

    $response->assertStatus(200);
});

test('unverified users can access protected workspace pages when phone verification is disabled', function () {
    config()->set('auth.phone_verification.enabled', false);

    $user = User::factory()->create([
        'phone_verified_at' => null,
    ]);

    $response = $this->actingAs($user)->get('/workspaces');

    $response->assertStatus(200);
});
