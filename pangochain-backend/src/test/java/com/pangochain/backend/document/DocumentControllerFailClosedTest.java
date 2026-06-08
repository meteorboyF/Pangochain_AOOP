package com.pangochain.backend.document;

import com.pangochain.backend.blockchain.FabricException;
import com.pangochain.backend.config.GlobalExceptionHandler;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class DocumentControllerFailClosedTest {

    @Mock DocumentService documentService;
    @Mock UserRepository userRepository;

    private MockMvc mockMvc;
    private UUID docId;
    private User domainUser;
    private UserDetails principal;

    @BeforeEach
    void setUp() {
        DocumentController controller = new DocumentController(documentService, userRepository);
        mockMvc = standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new TestUserDetailsResolver())
                .build();
        docId = UUID.randomUUID();
        domainUser = User.builder().id(UUID.randomUUID()).email("lawyer@firm.test").fullName("Lawyer").build();
        principal = org.springframework.security.core.userdetails.User
                .withUsername(domainUser.getEmail())
                .password("unused")
                .roles("ASSOCIATE_SENIOR")
                .build();
    }

    @Test
    void ciphertextEndpoint_mapsFabricOutageToHttp503WithoutBodyMaterial() throws Exception {
        when(userRepository.findByEmail(domainUser.getEmail())).thenReturn(Optional.of(domainUser));
        when(documentService.downloadCiphertext(docId, domainUser))
                .thenThrow(new FabricException("UNAVAILABLE: io exception"));

        mockMvc.perform(get("/api/documents/{id}/ciphertext", docId))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("FABRIC_UNAVAILABLE"));

        verify(documentService).downloadCiphertext(docId, domainUser);
    }

    @Test
    void wrappedKeyEndpoint_mapsFabricOutageToHttp503WithoutToken() throws Exception {
        when(userRepository.findByEmail(domainUser.getEmail())).thenReturn(Optional.of(domainUser));
        when(documentService.getWrappedKey(docId, domainUser))
                .thenThrow(new FabricException("UNAVAILABLE: io exception"));

        mockMvc.perform(get("/api/documents/{id}/wrapped-key", docId))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("FABRIC_UNAVAILABLE"));

        verify(documentService).getWrappedKey(docId, domainUser);
    }

    private class TestUserDetailsResolver implements HandlerMethodArgumentResolver {
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return UserDetails.class.isAssignableFrom(parameter.getParameterType());
        }

        @Override
        public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                      NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
            return principal;
        }
    }
}
