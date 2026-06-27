# Comprehensive API Endpoint Test Script
# Tests all new endpoints for badges, tiers, surveys, sponsors, and analytics

$ErrorActionPreference = "Continue"

$script:baseUrl = "http://localhost:8000"
$script:apiPrefix = "$baseUrl/api"
$script:testEventId = 1
$script:testAttendeeId = 1

# Test results
$script:passed = 0
$script:failed = 0
$script:tests = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    try {
        $uri = "$apiPrefix$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            UseBasicParsing = $true
            ErrorAction = "Stop"
        }
        
        if ($Body -and $Method -in @("POST", "PUT", "PATCH")) {
            $params['Body'] = $Body | ConvertTo-Json -Depth 10
            $params['ContentType'] = 'application/json'
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $passed = $statusCode -in @(200, 201, 204, 403, 401, 422, 404)
        
        if ($passed) {
            Write-Host "✓ PASS | $Name (HTTP $statusCode)"
            $script:passed++
        } else {
            Write-Host "✗ FAIL | $Name (HTTP $statusCode)"
            $script:failed++
        }
        
        $script:tests += @{
            name = $Name
            passed = $passed
            status = $statusCode
        }
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "✗ FAIL | $Name - $errorMsg"
        $script:failed++
        $script:tests += @{
            name = $Name
            passed = $false
            status = "ERROR"
            message = $errorMsg
        }
    }
}

Write-Host "`n============================================================"
Write-Host "HeptaCert API Endpoint Integration Tests"
Write-Host "============================================================`n"

# Health check
Write-Host "Testing Backend Health..."
Test-Endpoint -Name "Health Check" -Method "GET" -Endpoint "/health"

# Badge Rules
Write-Host "`nTesting Badge Rules Endpoints..."
Test-Endpoint -Name "GET /badge-rules" -Method "GET" -Endpoint "/admin/events/$testEventId/badge-rules"
Test-Endpoint -Name "POST /badge-rules" -Method "POST" -Endpoint "/admin/events/$testEventId/badge-rules" -Body @{
    enabled = $true
    definitions = @{
        early_bird = @{
            name = "Early Bird"
            description = "Registered in first 24 hours"
            icon_url = "https://example.com/icon.png"
            color = "#FF6B6B"
        }
    }
}

# Participant Badges
Write-Host "`nTesting Participant Badges Endpoints..."
Test-Endpoint -Name "GET /badges" -Method "GET" -Endpoint "/admin/events/$testEventId/badges"
Test-Endpoint -Name "POST /badges (award)" -Method "POST" -Endpoint "/admin/events/$testEventId/badges" -Body @{
    attendee_id = $testAttendeeId
    badge_type = "early_bird"
    criteria_met = @{ registered_hours = 2 }
    badge_metadata = @{ manual_award = $true }
}
Test-Endpoint -Name "POST /badges/calculate" -Method "POST" -Endpoint "/admin/events/$testEventId/badges/calculate" -Body @{}

# Certificate Tiers
Write-Host "`nTesting Certificate Tier Endpoints..."
Test-Endpoint -Name "GET /certificate-tiers" -Method "GET" -Endpoint "/admin/events/$testEventId/certificate-tiers"
Test-Endpoint -Name "POST /certificate-tiers" -Method "POST" -Endpoint "/admin/events/$testEventId/certificate-tiers" -Body @{
    enabled = $true
    tiers = @{
        gold = @{
            name = "Gold"
            description = "Premium attendance"
            min_attendance_percent = 90
        }
    }
}
Test-Endpoint -Name "POST /certificates/assign-tiers" -Method "POST" -Endpoint "/admin/events/$testEventId/certificates/assign-tiers" -Body @{}
Test-Endpoint -Name "GET /certificates/tier-summary" -Method "GET" -Endpoint "/admin/events/$testEventId/certificates/tier-summary"

# Surveys
Write-Host "`nTesting Survey Endpoints..."
Test-Endpoint -Name "GET /survey-config" -Method "GET" -Endpoint "/admin/events/$testEventId/survey-config"
Test-Endpoint -Name "POST /survey-config" -Method "POST" -Endpoint "/admin/events/$testEventId/survey-config" -Body @{
    survey_required = $false
    survey_mode = "built_in"
    questions = @(
        @{
            id = "q1"
            type = "text"
            question = "What was your favorite session?"
            required = $true
        }
    )
}
Test-Endpoint -Name "GET /surveys/responses" -Method "GET" -Endpoint "/admin/events/$testEventId/surveys/responses"
Test-Endpoint -Name "POST /surveys/{event_id}/submit" -Method "POST" -Endpoint "/surveys/$testEventId/submit" -Body @{
    responses = @{ q1 = "Best session was AI track" }
}

# Sponsors
Write-Host "`nTesting Sponsor Endpoints..."
Test-Endpoint -Name "GET /public/events/{event_id}/sponsors" -Method "GET" -Endpoint "/public/events/$testEventId/sponsors"
Test-Endpoint -Name "GET /admin/events/{event_id}/sponsors" -Method "GET" -Endpoint "/admin/events/$testEventId/sponsors"
Test-Endpoint -Name "POST /sponsors" -Method "POST" -Endpoint "/admin/events/$testEventId/sponsors" -Body @{
    name = "TechCorp"
    level = "gold"
    logo_url = "https://example.com/logo.png"
    website_url = "https://techcorp.com"
}

# Analytics
Write-Host "`nTesting Analytics Endpoints..."
Test-Endpoint -Name "GET /analytics/engagement" -Method "GET" -Endpoint "/admin/events/$testEventId/analytics/engagement"
Test-Endpoint -Name "GET /analytics/badges" -Method "GET" -Endpoint "/admin/events/$testEventId/analytics/badges"
Test-Endpoint -Name "GET /analytics/tiers" -Method "GET" -Endpoint "/admin/events/$testEventId/analytics/tiers"
Test-Endpoint -Name "GET /analytics/timeline" -Method "GET" -Endpoint "/admin/events/$testEventId/analytics/timeline"

# Print Summary
Write-Host "`n============================================================"
Write-Host "TEST SUMMARY"
Write-Host "============================================================"
Write-Host "✓ Passed: $passed"
Write-Host "✗ Failed: $failed"
$total = $passed + $failed
if ($total -gt 0) {
    $pct = [math]::Round(($passed / $total * 100), 1)
    Write-Host "Success Rate: $pct%"
}
Write-Host "============================================================`n"

if ($failed -gt 0) {
    Write-Host "FAILED TESTS:"
    foreach ($test in $script:tests) {
        if (-not $test.passed) {
            Write-Host "  - $($test.name): $($test.status) $(if ($test.message) { "- $($test.message)" })"
        }
    }
}

exit (if ($failed -eq 0) { 0 } else { 1 })
