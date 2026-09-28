package br.dev.extdigisac.domain;

import static br.dev.extdigisac.testing.AppAssertions.assertCode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.dev.extdigisac.testing.Samples;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PermissionPolicyTest {

    static final UUID T = UUID.randomUUID();
    static final DeptPermission FISCAL = new DeptPermission("d-fiscal", false, Set.of("s1"), false, Set.of("d-fiscal"));
    static final DeptPermission COMERCIAL = new DeptPermission("d-com", false, Set.of("s2"), false, Set.of("d-com", "d-fin"));
    static final DeptPermission TI = new DeptPermission("d-ti", true, Set.of(), true, Set.of());

    @Test
    void adminSeesEverythingEvenWithoutRules() {
        Allowed a = PermissionPolicy.resolve(Samples.admin(T), List.of());
        assertTrue(a.service("qualquer"));
        assertTrue(a.target("qualquer"));
    }

    @Test
    void userInTwoDepartmentsGetsTheUnion() {
        Allowed a = PermissionPolicy.resolve(Samples.attendant(T, "d-fiscal", "d-com"), List.of(FISCAL, COMERCIAL, TI));
        assertEquals(Set.of("s1", "s2"), a.serviceIds());
        assertEquals(Set.of("d-fiscal", "d-com", "d-fin"), a.targetIds());
        assertFalse(a.service("s3"));
    }

    @Test
    void wildcardDepartmentReleasesAll() {
        Allowed a = PermissionPolicy.resolve(Samples.attendant(T, "d-fiscal", "d-ti"), List.of(FISCAL, TI));
        assertTrue(a.allServices());
        assertTrue(a.service("s99"));
        assertTrue(a.target("d99"));
    }

    @Test
    void rulesOfOtherDepartmentsAreIgnored() {
        Allowed a = PermissionPolicy.resolve(Samples.attendant(T, "d-fiscal"), List.of(FISCAL, TI));
        assertFalse(a.allServices());
        assertEquals(Set.of("s1"), a.serviceIds());
    }

    @Test
    void userWithoutAnyRuleIsBlocked() {
        assertCode(ErrorCode.NO_PERMISSION_RULE,
                () -> PermissionPolicy.resolve(Samples.attendant(T, "d-rh"), List.of(FISCAL)));
    }

    @Test
    void ruleWithEmptyListsAllowsNothingButIsNotMissing() {
        var empty = new DeptPermission("d-rh", false, Set.of(), false, Set.of());
        Allowed a = PermissionPolicy.resolve(Samples.attendant(T, "d-rh"), List.of(empty));
        assertFalse(a.service("s1"));
    }

    @Test
    void requireServiceAndTargetThrowForbidden() {
        Allowed a = PermissionPolicy.resolve(Samples.attendant(T, "d-fiscal"), List.of(FISCAL));
        assertCode(ErrorCode.FORBIDDEN, () -> a.requireService("s2"));
        assertCode(ErrorCode.FORBIDDEN, () -> a.requireTarget("d-com"));
    }
}
